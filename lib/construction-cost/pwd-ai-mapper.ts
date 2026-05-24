import {
  searchExactPwdItems,
} from "./pwd-item-exact-rates";

export function mapBoqTextToPwdItems(
  text: string,
) {
  return searchExactPwdItems(text)
    .slice(0, 5);
}
