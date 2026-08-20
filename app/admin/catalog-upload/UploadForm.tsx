"use client";

import { useFormStatus } from "react-dom";

import { uploadCatalogAction } from "./actions";
import styles from "./upload.module.css";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className={styles.primaryButton} disabled={pending} type="submit">
      {pending ? "驗證並匯入中…" : "上傳並更新商品目錄"}
    </button>
  );
}

export default function UploadForm() {
  return (
    <form action={uploadCatalogAction} className={styles.uploadForm}>
      <label>
        <span>蝦皮「大量更新媒體資訊」Excel 檔</span>
        <input
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          name="catalogFile"
          required
          type="file"
        />
      </label>
      <p>僅接受 .xlsx，檔案上限 10 MB。驗證完成前不會修改現有目錄。</p>
      <SubmitButton />
    </form>
  );
}
