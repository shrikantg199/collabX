import type { Workspace } from "@/types";

type EditorProps = {
  activeWorkspace: Workspace | null;
};

export default function Editor({ activeWorkspace }: EditorProps) {
  return (
    <section className="panel editor-shell">
      <h3>Editor Panel</h3>
      <p className="muted">
        Day 1 focuses on auth, rooms, and chat. This panel is ready for Day 2
        collaborative editing work once Redis and editor sync land.
      </p>

      <div className="editor-hint">
        <strong>{activeWorkspace ? activeWorkspace.name : "No workspace selected"}</strong>
        <p style={{ marginBottom: 0 }}>
          Use this space next for presence, code editing, operational transform or CRDT sync,
          and Redis-backed fan-out across multiple server instances.
        </p>
      </div>
    </section>
  );
}
