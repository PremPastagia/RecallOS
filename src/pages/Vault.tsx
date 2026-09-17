import React, { useRef, useState } from "react";
import { KnowledgeService } from "../lib/dataService";

type ImportState = "idle" | "loading" | "done" | "error";

// Build Markdown from vault export — no zip dep needed; one .md file per vault
function buildMarkdownExport(vault: { count: number; exportedAt: string; concepts: any[] }): string {
  const lines: string[] = [];
  lines.push(`# Smriti Vault Export`);
  lines.push(`> Exported: ${new Date().toLocaleString()} · ${vault.count} concepts\n`);
  for (const c of vault.concepts) {
    lines.push(`---\n`);
    lines.push(`## ${c.title}\n`);
    lines.push(`**Summary:** ${c.summary}\n`);
    if (c.sourceContext) lines.push(`**Source:** ${c.sourceContext}\n`);
    lines.push(`**Created:** ${new Date(c.createdAt).toLocaleDateString()}\n`);
    lines.push(c.fullContent);
    lines.push('');
  }
  return lines.join('\n');
}

export function Vault() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [exportingMd, setExportingMd] = useState(false);
  const [importState, setImportState] = useState<ImportState>("idle");
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0, title: "" });
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: number } | null>(null);
  const [importError, setImportError] = useState("");

  const handleExport = async () => {
    setExporting(true);
    try {
      const vault = await KnowledgeService.exportVault();
      const blob = new Blob([JSON.stringify(vault, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a");
      a.href = url;
      a.download = `smriti_vault_${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed:", e);
    } finally {
      setExporting(false);
    }
  };

  const handleExportMarkdown = async () => {
    setExportingMd(true);
    try {
      const vault = await KnowledgeService.exportVault();
      const md = buildMarkdownExport(vault);
      const blob = new Blob([md], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a");
      a.href = url;
      a.download = `smriti_vault_${date}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Markdown export failed:", e);
    } finally {
      setExportingMd(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportState("loading");
    setImportResult(null);
    setImportError("");
    setImportProgress({ done: 0, total: 0, title: "" });
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.concepts || !Array.isArray(data.concepts)) {
        throw new Error("This file does not look like a valid Smriti vault export.");
      }
      const result = await KnowledgeService.importVault(
        data,
        (done, total, title) => setImportProgress({ done, total, title })
      );
      setImportResult(result);
      setImportState("done");
    } catch (err: any) {
      setImportError(err.message || "Failed to import vault file.");
      setImportState("error");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const progressPct = importProgress.total > 0 ? Math.round((importProgress.done / importProgress.total) * 100) : 0;

  return (
    <div style={{ width: "100%", maxWidth: "560px", margin: "0 auto", paddingTop: "2rem" }}>
      <h2 className="section-title" style={{ marginBottom: "0.5rem" }}>Vault</h2>
      <p style={{ color: "var(--color-text-secondary)", marginBottom: "2.5rem", fontSize: "1rem", lineHeight: 1.6 }}>
        Export your entire knowledge vault as a portable backup, or restore concepts from a previous export.
      </p>

      <section style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "1.5rem", marginBottom: "1.5rem", backgroundColor: "var(--color-card-bg)" }}>
        <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.1rem", color: "var(--color-text-obsidian)" }}>Export</h3>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem", margin: "0 0 1.25rem 0", lineHeight: 1.6 }}>
          Download your complete vault as <code>.json</code> (full backup) or <code>.md</code> (readable Markdown for Obsidian, Notion, etc).
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{ backgroundColor: "var(--color-accent-terracotta)", color: "white", border: "none", padding: "0.75rem 1.5rem", borderRadius: "var(--radius-md)", fontWeight: 600, fontSize: "0.95rem", cursor: exporting ? "not-allowed" : "pointer", opacity: exporting ? 0.6 : 1 }}
          >
            {exporting ? "Exporting…" : "Download JSON Backup"}
          </button>
          <button
            onClick={handleExportMarkdown}
            disabled={exportingMd}
            style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text-obsidian)", border: "1px solid var(--color-border)", padding: "0.75rem 1.5rem", borderRadius: "var(--radius-md)", fontWeight: 600, fontSize: "0.95rem", cursor: exportingMd ? "not-allowed" : "pointer", opacity: exportingMd ? 0.6 : 1 }}
          >
            {exportingMd ? "Exporting…" : "Download Markdown"}
          </button>
        </div>
      </section>

      <section style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "1.5rem", backgroundColor: "var(--color-card-bg)" }}>
        <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.1rem", color: "var(--color-text-obsidian)" }}>Import</h3>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem", margin: "0 0 1.25rem 0", lineHeight: 1.6 }}>
          Restore concepts from a Smriti vault backup. Concepts with identical titles will be skipped automatically.
        </p>
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} style={{ display: "none" }} id="vault-import-input" />
        <label htmlFor="vault-import-input" style={{ display: "inline-block", backgroundColor: "var(--color-bg)", color: "var(--color-text-obsidian)", border: "1px solid var(--color-border)", padding: "0.75rem 1.5rem", borderRadius: "var(--radius-md)", fontWeight: 600, fontSize: "0.95rem", cursor: importState === "loading" ? "not-allowed" : "pointer", pointerEvents: importState === "loading" ? "none" : "auto", opacity: importState === "loading" ? 0.6 : 1 }}>
          {importState === "loading" ? "Importing…" : "Select Backup File"}
        </label>

        {importState === "loading" && importProgress.total > 0 && (
          <div style={{ marginTop: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--color-text-secondary)", marginBottom: "0.4rem" }}>
              <span style={{ maxWidth: "70%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{importProgress.title}</span>
              <span>{progressPct}%</span>
            </div>
            <div style={{ height: "4px", borderRadius: "2px", backgroundColor: "var(--color-border)" }}>
              <div style={{ height: "4px", borderRadius: "2px", backgroundColor: "var(--color-accent-terracotta)", width: `${progressPct}%`, transition: "width 0.2s ease" }} />
            </div>
          </div>
        )}

        {importState === "done" && importResult && (
          <div style={{ marginTop: "1.25rem", padding: "0.75rem 1rem", borderRadius: "6px", backgroundColor: "#ECFCCB", border: "1px solid #86EFAC", fontSize: "0.9rem", color: "#14532D" }}>
            Import complete — <strong>{importResult.imported}</strong> added, <strong>{importResult.skipped}</strong> skipped, {importResult.errors} errors.
          </div>
        )}

        {importState === "error" && (
          <div style={{ marginTop: "1.25rem", padding: "0.75rem 1rem", borderRadius: "6px", backgroundColor: "#FEF2F2", border: "1px solid #FECACA", fontSize: "0.9rem", color: "#991B1B" }}>
            {importError}
          </div>
        )}
      </section>
    </div>
  );
}
