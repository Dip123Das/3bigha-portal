"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";

type Tag = {
  id: string;
  name: string;
  slug: string;
};

export function TagSelector(props: { postId: string; disabled?: boolean }) {
  const supabase = getSupabaseBrowser();

  const [tags, setTags] = useState<Tag[]>([]);
  const [linked, setLinked] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);

    const { data: allTags, error: e1 } = await supabase
      .from("blog_tags")
      .select("id,name,slug")
      .order("name");

    const { data: links, error: e2 } = await supabase
      .from("blog_post_tags")
      .select("tag_id")
      .eq("post_id", props.postId);

    if (e1) setError(e1.message);
    if (e2) setError((prev) => prev ?? e2.message);

    setTags((allTags ?? []) as Tag[]);
    setLinked((links ?? []).map((x: any) => x.tag_id));
  }

  useEffect(() => {
    if (props.postId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.postId]);

  async function toggle(tagId: string) {
    if (props.disabled) return;

    setError(null);

    if (linked.includes(tagId)) {
      const { error } = await supabase
        .from("blog_post_tags")
        .delete()
        .eq("post_id", props.postId)
        .eq("tag_id", tagId);

      if (error) setError(error.message);
    } else {
      const { error } = await supabase.from("blog_post_tags").insert({
        post_id: props.postId,
        tag_id: tagId,
      });

      if (error) setError(error.message);
    }

    load();
  }

  async function createTag() {
    if (props.disabled) return;

    const name = newTag.trim();
    if (!name) return;

    setError(null);

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

    const { error } = await supabase.from("blog_tags").insert({ name, slug });
    if (error) {
      setError(error.message);
      return;
    }

    setNewTag("");
    load();
  }

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontWeight: 800 }}>Tags</div>
        {props.disabled ? <Badge>Locked</Badge> : null}
      </div>

      {error ? (
        <div style={{ marginTop: 8, color: "crimson", fontWeight: 700 }}>{error}</div>
      ) : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10, marginBottom: 10 }}>
        {tags.length === 0 ? (
          <div style={{ opacity: 0.7 }}>No tags yet.</div>
        ) : (
          tags.map((t) => (
            <div
              key={t.id}
              onClick={() => toggle(t.id)}
              style={{ cursor: props.disabled ? "not-allowed" : "pointer" }}
              title={props.disabled ? "Published posts lock tags. Unpublish to edit tags." : "Click to toggle"}
            >
              <Badge>{linked.includes(t.id) ? `✓ ${t.name}` : t.name}</Badge>
            </div>
          ))
        )}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          placeholder="New tag"
          style={{ padding: 10, flex: 1 }}
          disabled={!!props.disabled}
        />
        <ActionButton variant="secondary" onClick={createTag} disabled={!!props.disabled}>
          Add
        </ActionButton>
      </div>
    </div>
  );
}
