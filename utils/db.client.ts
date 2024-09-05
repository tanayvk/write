import { nanoid } from "nanoid";
import initWasm from "@vlcn.io/crsqlite-wasm";
import wasmUrl from "@vlcn.io/crsqlite-wasm/crsqlite.wasm?url";

let sqlite, db: any;
let resolves: Function[] = [];

export const updatedAtTrigger = (tableName: string) => `
CREATE TRIGGER IF NOT EXISTS ${tableName}_update
    AFTER UPDATE
    ON ${tableName}
    FOR EACH ROW
    WHEN NEW.updates = OLD.updates
BEGIN
    UPDATE ${tableName} SET updated_at = CURRENT_TIMESTAMP, updates = updates + 1 WHERE id=OLD.id;
END;
`;

export const createTable = async (
  tableName: string,
  columns: string,
  crr = true,
  constraints = "",
) => {
  await db.exec(
    `CREATE TABLE IF NOT EXISTS ${tableName} (id primary key not null, ${columns}, created_at timestamp NOT NULL DEFAULT current_timestamp,
     updated_at timestamp NOT NULL DEFAULT current_timestamp, updates int DEFAULT 0${
       constraints ? `, ${constraints}` : ""
     })`,
  );
  await db.exec(updatedAtTrigger(tableName));
  if (crr) await db.exec(`SELECT crsql_as_crr('${tableName}')`);
};

export const createIndex = async (
  tableName: string,
  indexName: string,
  fields: string,
) => {
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_${tableName}_${indexName}
                 ON ${tableName} (${fields})`);
};

const migrations = [
  async function first() {
    await db.exec("PRAGMA recursive_triggers = 1");
    await createTable("writing", "title, idx, current");
    await createTable("text", "writing, text, idx");
    await createTable("peer", "name, version", false);
    await createTable("device", "name", false);
    await db.exec("INSERT INTO device (id, name) VALUES (1, 'Device Name')");

    await createIndex("text", "by_writing", "writing, idx");
  },
];

const runMigrations = async () => {
  let [{ user_version } = { user_version: 0 }] = await db.execO(
    "PRAGMA user_version",
  );
  while (user_version < migrations.length) {
    await migrations[user_version]?.();
    user_version++;
    await db.exec(`PRAGMA user_version = ${user_version}`);
  }
};

export const clean = async () => {
  const databases = await indexedDB.databases();
  for (const database of databases) {
    indexedDB.deleteDatabase(database.name as string);
  }
};

export const dbInit = async () => {
  sqlite = await initWasm(() => wasmUrl);
  db = await sqlite.open("my-database.db");
  // await clean();
  await runMigrations();
  resolves.forEach((res) => res(db));
};

export const getDB = () => {
  if (db) return db;
  return new Promise((res) => resolves.push(res));
};

export const getSiteId = async () => {
  const db = await getDB();
  const [{ site_id }] = await db.execO(
    "SELECT hex(crsql_site_id()) AS site_id",
  );
  return site_id;
};

export const getPeers = async () => {
  const db = await getDB();
  const peers = await db.execO("SELECT id, name, version FROM peer");
  return peers;
};

export const getChanges = async (peers: any[]) => {
  const db = await getDB();
  const changes = [];
  for (const peer of peers) {
    changes.push(
      await db.execA(
        "SELECT * FROM crsql_changes WHERE db_version > ? AND hex(site_id) = ?",
        [peer.version || 0, peer.id],
      ),
    );
  }
  return changes.flat();
};

export const applyChanges = async (changes: any[]) => {
  if (changes.length === 0) return;
  const db = await getDB();
  const siteId = await getSiteId();
  const maxVersions: Record<string, number> = {};
  await db.tx(async (tx: any) => {
    for (const change of changes) {
      const changeSite = [...new Uint8Array(change[6])]
        .map((x) => x.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
      if (siteId === changeSite) {
        continue;
      }
      maxVersions[changeSite] = Math.max(
        maxVersions[changeSite] || 0,
        change[5],
      );
      await tx.exec(
        "INSERT INTO crsql_changes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        change.map((c: any) => {
          if (typeof c === "object") return new Uint8Array(c);
          return c;
        }),
      );
    }
    for (const [peer, version] of Object.entries(maxVersions)) {
      await tx.exec(
        `INSERT INTO peer (id, version) VALUES (?, ?)
         ON CONFLICT DO UPDATE SET version = MAX(IFNULL(version, 0), excluded.version)`,
        [peer, version],
      );
    }
  });
  updateWritings();
};

export const getVersion = async (id: string) => {
  const db = await getDB();
  const [{ version } = { version: null }] = await db.execO(
    "SELECT version FROM peer WHERE id = ?",
    [id],
  );
  return version || 0;
};

export const addOrUpdatePeer = async (id: string, update: any) => {
  const db = await getDB();
  const keys = Object.keys(update);
  const values = Object.values(update);
  await db.exec(
    `INSERT INTO peer (id${
      keys.length ? "," + keys.join(",") : ""
    }) VALUES (${Array.from(new Array(1 + keys.length))
      .map((_) => "?")
      .join(",")})
      ${keys.length ? "ON CONFLICT DO UPDATE SET" : ""} ${keys
        .map((k) => `${k} = excluded.${k}`)
        .join(",")}`,
    [id, ...values],
  );
  usePeers().value = await getPeers();
};

export const getDeviceName = async () => {
  const db = await getDB();
  const [{ name }] = await db.execO("SELECT name FROM device");
  return name;
};

export const updateDeviceName = async (name: string) => {
  const db = await getDB();
  await db.exec("UPDATE device SET name = ?", [name]);
};

export const createNewWriting = async () => {
  const db = await getDB();
  const id = nanoid();
  await db.exec(`INSERT INTO writing (id) VALUES (?)`, [id]);
  updateWritings();
  return id;
};

export const getWritings = async () => {
  const db = await getDB();
  return await db.execO("SELECT * FROM writing ORDER BY created_at DESC");
};

export const getWritingText = async (id: string) => {
  const db = await getDB();
  let current = "",
    texts: string[] = [];
  await db.tx(async (tx: any) => {
    texts = await tx.execO(
      "SELECT text, created_at FROM text WHERE writing = ? ORDER BY idx",
      [id],
    );
    current =
      (await tx.execO("SELECT current FROM writing WHERE id = ?", [id]))?.[0]
        ?.current || "";
  });
  return { texts, current };
};

export const saveText = async (
  writing: string,
  text: string,
  current: string,
  title: string | null,
) => {
  const db = await getDB();
  let idx = 0;
  await db.tx(async (tx: any) => {
    if (text) {
      const w = await tx.execO("SELECT idx FROM writing WHERE id = ?", [
        writing,
      ]);
      idx = w[0]?.idx;
      await tx.exec(
        "INSERT INTO text (id, writing, text, idx) VALUES (?, ?, ?, ?)",
        [`${writing}-${idx + 1}`, writing, text, idx + 1],
      );
    }

    await tx.exec(
      `UPDATE writing SET current = ?${title ? ", title = ?" : ""}${
        text ? ", idx = ?" : ""
      } WHERE id = ?`,
      [current, ...(title ? [title] : []), ...(text ? [idx + 1] : []), writing],
    );
  });
};

export const deleteWritingByID = async (id: string) => {
  const db = getDB();
  await db.exec("DELETE FROM writing WHERE id = ?", [id]);
  updateWritings();
};

export const getSessionsInRange = async (from: Date, to: Date) => {
  const db = getDB();
  return await db.execO(
    `SELECT (LENGTH(text) - LENGTH(REPLACE(text, ' ', '')) + CAST(LENGTH(text) > 0 AS INT)) as words,
    created_at FROM text WHERE created_at >= datetime(?, 'unixepoch')
    AND created_at <= datetime(?, 'unixepoch') ORDER BY created_at`,
    [Math.floor(from.getTime() / 1000), Math.floor(to.getTime() / 1000)],
  );
};
