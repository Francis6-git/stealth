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
import { emails as initialEmails, getEmailsForFolder, mailFolders, type Email, type MailFolder } from "@/components/mail/data";

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
  const [emails, setEmails] = useState<Email[]>(initialEmails);
  const [selectedId, setSelectedId] = useState<string | null>(initialEmails[0].id);
  const [collapsed, setCollapsed] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeInitial, setComposeInitial] = useState<{ to?: string; subject?: string; body?: string }>({});
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
    [emails],
  );
  const visibleEmails = useMemo(() => getEmailsForFolder(emails, folder), [emails, folder]);
  const selected = emails.find((e) => e.id === selectedId) ?? null;
  
  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  };

  const updateEmail = (id: string, patch: Partial<Email>) => {
    setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const openCompose = (initial: { to?: string; subject?: string; body?: string } = {}) => {
    setComposeInitial(initial);
    setComposeOpen(true);
  };

  const quoteBody = (e: Email) =>
    `\n\n---\nOn ${e.time}, ${e.from} <${e.email}> wrote:\n${e.body
      .split("\n")
      .map((l) => `> ${l}`)
      .join("\n")}`;

  const emailActions = {
    onReply: (e: Email, body?: string) => {
      if (body && body.trim()) {
        showToast(`Reply sent to ${e.from}`);
        return;
      }
      openCompose({
        to: e.email,
        subject: e.subject.startsWith("Re: ") ? e.subject : `Re: ${e.subject}`,
        body: quoteBody(e),
      });
    },
    onReplyAll: (e: Email) => {
      openCompose({
        to: e.email,
        subject: e.subject.startsWith("Re: ") ? e.subject : `Re: ${e.subject}`,
        body: quoteBody(e),
      });
    },
    onForward: (e: Email) => {
      openCompose({
        to: "",
        subject: e.subject.startsWith("Fwd: ") ? e.subject : `Fwd: ${e.subject}`,
        body: quoteBody(e),
      });
    },
    onArchive: (e: Email) => {
      updateEmail(e.id, { folder: "archive" });
      showToast(`Archived "${e.subject}"`);
    },
    onTrash: (e: Email) => {
      updateEmail(e.id, { folder: "trash" });
      showToast(`Moved "${e.subject}" to trash`);
    },
    onToggleStar: (e: Email) => {
      updateEmail(e.id, { starred: !e.starred });
      showToast(e.starred ? "Removed star" : "Starred");
    },
  };

  // Mark as read on selection
  useEffect(() => {
    if (!selectedId) return;
    const cur = emails.find((e) => e.id === selectedId);
    if (cur?.unread) updateEmail(selectedId, { unread: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen((v) => !v); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") { e.preventDefault(); openCompose(); }
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
          onCompose={() => openCompose()}
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
            <EmailView email={selected} actions={emailActions} />
          </div>
        </div>
      </div>

      <Compose
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        onShowToast={showToast}
        initialTo={composeInitial.to}
        initialSubject={composeInitial.subject}
        initialBody={composeInitial.body}
      />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <CommandPalette 
        open={paletteOpen} 
        onClose={() => setPaletteOpen(false)}
        onCompose={() => openCompose()}
        onNavigate={(f) => {
          setFolder(f);
          setCustomFolder(null);
        }}
        onArchive={() => {
          if (selected) {
            emailActions.onArchive(selected);
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
            className="glass-strong fixed bottom-6 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-3 rounded-xl px-4 py-3 text-xs shadow-[0_18px_50px_-12px_rgba(0,0,0,0.7)]"
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
