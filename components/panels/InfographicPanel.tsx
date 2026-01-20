import React, { useState, useEffect } from 'react';
import pollinationsService from '../../services/pollinationsService';

/**
 * Enhanced Infographic Panel with Pollinations.ai Integration
 * Generates rich visual infographics with AI-generated assets
 */
const EnhancedInfographicPanel = ({ sourceContent, existingInfographicLogic }) => {
  const [infographicData, setInfographicData] = useState(null);
  const [visualAssets, setVisualAssets] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const enhanceInfographicWithVisuals = async (baseInfographic) => {
    setLoading(true);
    setError(null);

    try {
      const assetRequests = [];

      if (baseInfographic.header) {
        assetRequests.push({
          id: 'header',
          type: 'infographic',
          data: {
            title: baseInfographic.header.title,
            chartType: 'header',
            width: 1920,
            height: 300
          },
          assetType: 'header'
        });
      }

      baseInfographic.sections?.forEach((section, index) => {
        if (section.keyPoints?.length > 0) {
          assetRequests.push({
            id: `section-${index}-icons`,
            type: 'infographic',
            data: {
              title: section.title,
              concepts: section.keyPoints,
              chartType: 'iconSet',
              width: 800,
              height: 200
            },
            assetType: 'iconSet'
          });
        }

        if (section.data || section.statistics) {
          assetRequests.push({
            id: `section-${index}-chart`,
            type: 'infographic',
            data: {
              title: section.title,
              chartType: section.chartType || 'bar',
              dataDescription: section.dataDescription || section.title,
              width: 1200,
              height: 600
            },
            assetType: 'dataVisual'
          });
        }

        assetRequests.push({
          id: `divider-${index}`,
          type: 'infographic',
          data: {
            title: section.title,
            width: 1920,
            height: 100
          },
          assetType: 'sectionDivider'
        });
      });

      const generatedAssets = await pollinationsService.batchGenerate(assetRequests);

      const assetMap = {};
      generatedAssets.forEach(result => {
        if (result.status === 'fulfilled' && result.data) {
          assetMap[result.id] = result.data;
        }
      });

      setVisualAssets(assetMap);

      const enhancedInfographic = {
        ...baseInfographic,
        header: {
          ...baseInfographic.header,
          backgroundImage: assetMap['header']
        },
        sections: baseInfographic.sections?.map((section, index) => ({
          ...section,
          visuals: {
            icons: assetMap[`section-${index}-icons`],
            chart: assetMap[`section-${index}-chart`],
            divider: assetMap[`divider-${index}`]
          }
        }))
      };

      return enhancedInfographic;

    } catch (err) {
      console.error('Infographic enhancement error:', err);
      setError(err.message);
      return baseInfographic;
    } finally {
      setLoading(false);
    }
  };

  const generateInfographic = async () => {
    const baseInfographic = await existingInfographicLogic(sourceContent);
    const enhancedInfographic = await enhanceInfographicWithVisuals(baseInfographic);
    setInfographicData(enhancedInfographic);
  };

  useEffect(() => {
    if (sourceContent) {
      generateInfographic();
    }
  }, [sourceContent]);

  const renderEnhancedInfographic = () => {
    if (!infographicData) return null;

    return (
      <div className="enhanced-infographic">
        <div 
          className="infographic-header"
          style={{
            backgroundImage: `url(${infographicData.header?.backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            minHeight: '300px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'white',
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
            padding: '40px'
          }}
        >
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
            {infographicData.header?.title}
          </h1>
          <p style={{ fontSize: '1.5rem' }}>
            {infographicData.header?.subtitle}
          </p>
        </div>

        {infographicData.sections?.map((section, index) => (
          <div key={index} className="infographic-section">
            {section.visuals?.divider && (
              <img 
                src={section.visuals.divider} 
                alt="Section divider"
                className="section-divider"
              />
            )}

            <h2>{section.title}</h2>

            {section.visuals?.icons && (
              <div className="section-icons">
                <img 
                  src={section.visuals.icons} 
                  alt={`Icons for ${section.title}`}
                  className="concept-icons"
                />
              </div>
            )}

            <ul className="key-points">
              {section.keyPoints?.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>

            {section.visuals?.chart && (
              <div className="section-chart">
                <img 
                  src={section.visuals.chart} 
                  alt={`Chart for ${section.title}`}
                  className="data-visualization"
                />
              </div>
            )}

            {section.content && (
              <p className="section-content">{section.content}</p>
            )}

            {section.statistics && (
              <div className="statistics-grid">
                {section.statistics.map((stat, idx) => (
                  <div key={idx} className="stat-card">
                    <div className="stat-value">{stat.value}</div>
                    <div className="stat-label">{stat.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="loading-overlay">
        <p>Generating AI-powered visual assets...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-notice">
        <p>Visual enhancement unavailable. Showing base infographic.</p>
      </div>
    );
  }

  return renderEnhancedInfographic();
};

export default EnhancedInfographicPanel;
