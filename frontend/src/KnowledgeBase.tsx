import React, { useEffect, useState } from "react";
import styles from "./App.module.css";

export default function KnowledgeBase({ role }: { role: string }) {
  const [articles, setArticles] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchArticles() {
      setLoading(true);
      setError(null);
      try {
        const params = search ? `?search=${encodeURIComponent(search)}` : "";
        const res = await fetch(`/api/knowledge-base${params}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load articles");
        setArticles(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchArticles();
  }, [search]);

  return (
    <div className={styles.card}>
      <h2>Knowledge Base</h2>
      <input
        type="text"
        placeholder="Search articles..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={styles.form}
      />
      {loading ? (
        <div>Loading articles...</div>
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : (
        <ul>
          {articles.map((article) => (
            <li key={article.id}>
              <b>{article.title}</b> <br />
              <span>{article.summary}</span>
              {article.videoUrl && (
                <div>
                  <video src={article.videoUrl} controls width={320} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
