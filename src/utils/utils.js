export default class Utils {
  static isBug(issueType) {
    return issueType.toUpperCase() === 'BUG';
  }

  static isSimilarText(textA, textB) {
    return textA === textB;
  }
}
