import React from 'react';

/**
 * Report Panel - Standard report generation
 * Uses existing logic without Pollinations integration
 */
const ReportPanel = ({ sourceContent }) => {
  return (
    <div className="report-panel">
      <h2>Report Panel</h2>
      <p>Standard report generation (no AI enhancement)</p>
      {sourceContent && (
        <div className="report-content">
          <pre>{JSON.stringify(sourceContent, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default ReportPanel;
