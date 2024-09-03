export function getLastThreeWordsLength(str) {
  let wordCount = 0;
  for (let i = str.length - 1; i >= 0; i--) {
    if (str[i] === " ") {
      wordCount++;
      if (wordCount === 3) {
        return str.length - i;
      }
    }
  }
  return str.length;
}
