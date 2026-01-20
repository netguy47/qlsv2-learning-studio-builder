import React from 'react';

/**
 * Notes Panel - Standard notes generation
 * Uses existing logic without Pollinations integration
 */
const NotesPanel = ({ sourceContent }) => {
  return (
    <div className="notes-panel">
      <h2>Notes Panel</h2>
      <p>Standard notes generation (no AI enhancement)</p>
      {sourceContent && (
        <div className="notes-content">
          <pre>{JSON.stringify(sourceContent, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default NotesPanel;
