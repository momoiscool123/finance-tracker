import { useState } from "react";
import { Download } from "lucide-react";

// "Get the app" page. Yes works; No playfully dodges the cursor so it can
// never be clicked (jumps to a small random offset on hover/tap).
export default function DownloadPage() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [accepted, setAccepted] = useState(false);

  const dodge = () => {
    const x = Math.round((Math.random() * 2 - 1) * 110);
    const y = Math.round((Math.random() * 2 - 1) * 50);
    setOffset({ x, y });
  };

  return (
    <>
      <header className="ft-header">
        <div>
          <p className="ft-greeting">Tracklet</p>
          <h1 className="ft-header__title">Get the app</h1>
          <p className="ft-header__sub">Take your finances with you — anywhere.</p>
        </div>
      </header>

      <div className="dl-page">
        <div className="dl-card">
          <span className="dl-badge">
            <Download size={30} />
          </span>

          {accepted ? (
            <>
              <h2 className="dl-title">You&rsquo;re in! 🎉</h2>
              <p className="dl-sub">
                Awesome — we&rsquo;ll let you know the moment the Tracklet app is
                ready to download.
              </p>
            </>
          ) : (
            <>
              <h2 className="dl-title">Download Tracklet on your phone?</h2>
              <p className="dl-sub">
                Track spending, log transactions and check your dashboard on the go.
              </p>
              <div className="dl-actions">
                <button
                  type="button"
                  className="dl-btn dl-btn--yes"
                  onClick={() => setAccepted(true)}
                >
                  Yes, I&rsquo;m in
                </button>
                <button
                  type="button"
                  className="dl-btn dl-btn--no"
                  style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
                  onMouseEnter={dodge}
                  onClick={dodge}
                >
                  No thanks
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
