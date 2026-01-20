import React from 'react';

/**
 * Podcast Panel - Standard podcast generation
 * Uses existing logic without Pollinations integration
 */
const PodcastPanel = ({ sourceContent }) => {
  return (
    <div className="podcast-panel">
      <h2>Podcast Panel</h2>
      <p>Standard podcast generation (no AI enhancement)</p>
      {sourceContent && (
        <div className="podcast-content">
          <pre>{JSON.stringify(sourceContent, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default PodcastPanel;
