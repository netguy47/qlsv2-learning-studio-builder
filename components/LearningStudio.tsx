import React, { useState } from 'react';
import EnhancedInfographicPanel from './panels/InfographicPanel';
import EnhancedSlideDeckPanel from './panels/SlideDeckPanel';
import ReportPanel from './panels/ReportPanel';
import NotesPanel from './panels/NotesPanel';
import PodcastPanel from './panels/PodcastPanel';

/**
 * Main Learning Studio Component
 * Routes to appropriate panel based on user selection
 * Pollinations integration is ISOLATED to Infographic and Slide Deck
 */
const LearningStudio = () => {
  const [activePanel, setActivePanel] = useState(null);
  const [sourceContent, setSourceContent] = useState(null);

  const handlePanelSelection = (panelType) => {
    setActivePanel(panelType);
  };

  const renderActivePanel = () => {
    switch (activePanel) {
      case 'podcast':
        return <PodcastPanel sourceContent={sourceContent} />;
      
      case 'report':
        return <ReportPanel sourceContent={sourceContent} />;
      
      case 'notes':
        return <NotesPanel sourceContent={sourceContent} />;
      
      case 'infographic':
        return (
          <EnhancedInfographicPanel
            sourceContent={sourceContent}
            existingInfographicLogic={async (content) => ({
              header: {
                title: content.title || 'Infographic',
                subtitle: content.subtitle || ''
              },
              sections: content.sections || []
            })}
          />
        );
      
      case 'slidedeck':
        return (
          <EnhancedSlideDeckPanel
            sourceContent={sourceContent}
            existingSlideDeckLogic={async (content) => ({
              slides: content.slides || []
            })}
          />
        );
      
      default:
        return (
          <div className="panel-selector">
            <h2>Select a Panel Type</h2>
            <div className="panel-grid">
              <button onClick={() => handlePanelSelection('podcast')}>
                🎙️ Podcast
              </button>
              <button onClick={() => handlePanelSelection('report')}>
                📄 Report
              </button>
              <button onClick={() => handlePanelSelection('notes')}>
                📝 Notes
              </button>
              <button onClick={() => handlePanelSelection('infographic')}>
                📊 Infographic (AI-Enhanced)
              </button>
              <button onClick={() => handlePanelSelection('slidedeck')}>
                🎨 Slide Deck (AI-Enhanced)
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="learning-studio">
      <header className="studio-header">
        <h1>QLSV2 Learning Studio</h1>
        {activePanel && (
          <button onClick={() => setActivePanel(null)}>
            ← Back to Selection
          </button>
        )}
      </header>

      <main className="studio-content">
        {renderActivePanel()}
      </main>
    </div>
  );
};

export default LearningStudio;
