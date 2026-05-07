import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AmbientBackground } from "@/components/mail/AmbientBackground";
import { Sidebar } from "@/components/mail/Sidebar";
import { Topbar } from "@/components/mail/Topbar";
import { EmailList } from "@/components/mail/EmailList";
import { EmailView } from "@/components/mail/EmailView";
import { Compose } from "@/components/mail/Compose";
import { CommandPalette } from "@/components/mail/CommandPalette";
import { SettingsModal } from "@/components/mail/SettingsModal";
import { emails, getEmailsForFolder, mailFolders, type MailFolder } from "@/components/mail/data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Stealth" },
      { name: "description", content: "Stealth is a cryptographic mail client built on Stellar." },
      { property: "og:title", content: "Stealth" },
      { property: "og:description", content: "Cryptographic mail identities, postage, and delivery proofs on Stellar." },
    ],
  }),
  component: MailApp,
});

function MailApp() {
  const [folder, setFolder] = useState<MailFolder>("inbox");
  const [selectedId, setSelectedId] = useState<string | null>(emails[0].id);
  const [collapsed, setCollapsed] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [customFolder, setCustomFolder] = useState<string | null>(null);

  const folderCounts = useMemo(
    () =>
      Object.fromEntries(mailFolders.map((item) => [item.key, getEmailsForFolder(emails, item.key).length])) as Record<
        MailFolder,
        number
      >,
    [],
  );
  const visibleEmails = useMemo(() => getEmailsForFolder(emails, folder), [folder]);
  const selected = emails.find((e) => e.id === selectedId) ?? null;
  
  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen((v) => !v); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") { e.preventDefault(); setComposeOpen(true); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  useEffect(() => {
    if (!visibleEmails.some((email) => email.id === selectedId)) {
      setSelectedId(visibleEmails[0]?.id ?? null);
    }
  }, [folder, selectedId, visibleEmails]);

  return (
    <div className="relative min-h-screen text-foreground">
      <AmbientBackground />

      <div className="flex min-h-screen">
        <Sidebar
          active={folder}
          counts={folderCounts}
          onSelect={(f) => {
            setFolder(f);
            setCustomFolder(null);
          }}
          collapsed={collapsed}
          onToggle={() => setCollapsed((v) => !v)}
          onCompose={() => setComposeOpen(true)}
          customFolder={customFolder}
          onSelectCustomFolder={setCustomFolder}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar 
            onOpenPalette={() => setPaletteOpen(true)} 
            onOpenSettings={() => setSettingsOpen(true)}
            onShowToast={showToast}
          />
          <div className="flex min-w-0 flex-1">
            <EmailList emails={emails} selectedId={selectedId} onSelect={setSelectedId} folder={folder} />
            <EmailView email={selected} />
          </div>
        </div>
      </div>

      <Compose open={composeOpen} onClose={() => setComposeOpen(false)} onShowToast={showToast} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <CommandPalette 
        open={paletteOpen} 
        onClose={() => setPaletteOpen(false)}
        onCompose={() => setComposeOpen(true)}
        onNavigate={(f) => {
          setFolder(f);
          setCustomFolder(null);
        }}
        onArchive={() => {
          if (selectedId) {
            showToast("Thread archived");
          }
        }}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="glass-strong fixed bottom-6 left-6 z-30 flex items-center gap-3 rounded-xl px-4 py-3 text-xs"
          >
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[oklch(0.85_0.005_270)]" />
            <span className="text-foreground">{toast}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-muted-foreground transition hover:text-foreground">Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
