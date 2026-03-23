const parseFilenameFromDisposition = (value) => {
  const header = String(value || "");
  // Supports: attachment; filename="invoice-123.pdf"
  const m = header.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
  const raw = decodeURIComponent(m?.[1] || m?.[2] || "");
  return raw || "";
};

export const downloadBlob = ({ blob, filename }) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "download";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

export const downloadAxiosBlobResponse = (response, fallbackFilename) => {
  const contentDisposition = response?.headers?.["content-disposition"];
  const filename =
    parseFilenameFromDisposition(contentDisposition) || fallbackFilename;

  const blob =
    response?.data instanceof Blob
      ? response.data
      : new Blob([response?.data], {
          type:
            response?.headers?.["content-type"] || "application/octet-stream",
        });

  downloadBlob({ blob, filename });
};
