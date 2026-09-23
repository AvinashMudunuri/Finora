export async function readFileText(file: Blob): Promise<string> {
  if (typeof file.text === "function") {
    return file.text();
  }
  return readWithReader(file, "text");
}

export async function readFileBytes(file: Blob): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === "function") {
    return file.arrayBuffer();
  }
  return readWithReader(file, "buffer");
}

function readWithReader(file: Blob, mode: "text"): Promise<string>;
function readWithReader(file: Blob, mode: "buffer"): Promise<ArrayBuffer>;
function readWithReader(
  file: Blob,
  mode: "text" | "buffer",
): Promise<string | ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result ?? (mode === "text" ? "" : new ArrayBuffer(0)));
    };
    reader.onerror = () => {
      reject(new Error("We couldn't read that file."));
    };
    if (mode === "text") {
      reader.readAsText(file);
      return;
    }
    reader.readAsArrayBuffer(file);
  });
}
