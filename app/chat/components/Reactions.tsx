"use client";

interface ReactionState {
  like?: boolean;
  dislike?: boolean;
}

export function Reactions({
  reactions,
  onReact,
}: {
  reactions?: ReactionState;
  onReact: (type: "like" | "dislike") => void;
}) {
  return (
    <div className="reactions">
      <button
        className={`reaction-btn${reactions?.like ? " active" : ""}`}
        onClick={() => onReact("like")}
        type="button"
        aria-label="Gostei"
        title="Gostei"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill={reactions?.like ? "currentColor" : "none"}>
          <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <button
        className={`reaction-btn${reactions?.dislike ? " active" : ""}`}
        onClick={() => onReact("dislike")}
        type="button"
        aria-label="Não gostei"
        title="Não gostei"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill={reactions?.dislike ? "currentColor" : "none"}>
          <path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10zM17 2h2.67A2.31 2.31 0 0122 4.33v7.34a2.31 2.31 0 01-2.33 2.33H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}
