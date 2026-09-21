export const normalizePostgresSql = (sql) => {
  let index = 0;
  let result = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i < sql.length; i += 1) {
    const character = sql[i];
    const previous = i > 0 ? sql[i - 1] : "";

    if (character === "'" && !inDoubleQuote && previous !== "\\") {
      inSingleQuote = !inSingleQuote;
      result += character;
      continue;
    }

    if (character === '"' && !inSingleQuote && previous !== "\\") {
      inDoubleQuote = !inDoubleQuote;
      result += character;
      continue;
    }

    if (character === "?" && !inSingleQuote && !inDoubleQuote) {
      index += 1;
      result += `$${index}`;
      continue;
    }

    result += character;
  }

  return result;
};
