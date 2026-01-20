import React, { useState, useEffect, useRef } from 'react';
import pollinationsService from '../../services/pollinationsService';

/**
 * Enhanced Slide Deck Panel with Pollinations.ai Integration
 * Generates rich multimedia slides with AI visuals, variants, and narration
 */
const EnhancedSlideDeckPanel = ({ sourceContent, existingSlideDeckLogic }) => {
  const [slides, setSlides] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(false);
  const [visualMode, setVisualMode] = useState('standard');
  const [audioNarration, setAudioNarration] = useState({});
  const audioRef = useRef(null);

  const normalizeSlides = (input) => {
    if (Array.isArray(input)) return input;
    if (input && Array.isArray(input.slides)) return input.slides;
    return [];
  };

  const enhanceSlidesWithMultimedia = async (baseSlides) => {
    setLoading(true);

    try {
      const enhancementRequests = [];

      baseSlides.forEach((slide, index) => {
        enhancementRequests.push({
          id: `slide-${index}-visual`,
          type: 'slide',
          slideData: {
            slideType: slide.type || 'content',
            concept: slide.title || slide.content,
            keyPoints: slide.keyPoints || [],
            visualStyle: getVisualStyleForMode(visualMode)
          },
          options: {
            width: 1920,
            height: 1080,
            seed: index * 1000,
            viralMode: visualMode === 'viral'
          }
        });

        if (visualMode !== 'viral') {
          enhancementRequests.push({
            id: `slide-${index}-viral-variant`,
            type: 'slide',
            slideData: {
              slideType: slide.type || 'content',
              concept: slide.title || slide.content,
              keyPoints: slide.keyPoints || [],
              visualStyle: 'engaging-viral'
            },
            options: {
              width: 1920,
              height: 1080,
              viralMode: true
            }
          });
        }

        if (slide.narrationText || slide.content) {
          enhancementRequests.push({
            id: `slide-${index}-audio`,
            type: 'audio',
            text: slide.narrationText || slide.content || slide.title,
            options: {
              voice: 'default',
              speed: 1.0
            }
          });
        }
      });

      const results = await pollinationsService.batchGenerate(enhancementRequests);

      const assetMap = {};
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.data) {
          assetMap[result.id] = result.data;
        }
      });

      const enhancedSlides = baseSlides.map((slide, index) => ({
        ...slide,
        visuals: {
          primary: assetMap[`slide-${index}-visual`],
          viralVariant: assetMap[`slide-${index}-viral-variant`],
          currentDisplay: assetMap[`slide-${index}-visual`]
        },
        audio: {
          narrationUrl: assetMap[`slide-${index}-audio`],
          enabled: false
        },
        metadata: {
          slideNumber: index + 1,
          totalSlides: baseSlides.length,
          hasVisuals: !!assetMap[`slide-${index}-visual`],
          hasAudio: !!assetMap[`slide-${index}-audio`]
        }
      }));

      return enhancedSlides;

    } catch (error) {
      console.error('Slide enhancement error:', error);
      return baseSlides.map(slide => ({
        ...slide,
        enhancementError: true
      }));
    } finally {
      setLoading(false);
    }
  };

  const getVisualStyleForMode = (mode) => {
    const styles = {
      standard: 'modern-minimal',
      viral: 'engaging-viral',
      minimal: 'modern-minimal',
      data: 'data-focused'
    };
    return styles[mode] || 'modern-minimal';
  };

  const generateSlideDeck = async () => {
    const rawSlides = await existingSlideDeckLogic(sourceContent);
    const baseSlides = normalizeSlides(rawSlides);
    const enhancedSlides = await enhanceSlidesWithMultimedia(baseSlides);
    setSlides(enhancedSlides);
  };

  const goToSlide = (index) => {
    if (index >= 0 && index < slides.length) {
      setCurrentSlide(index);
    }
  };

  const nextSlide = () => goToSlide(currentSlide + 1);
  const previousSlide = () => goToSlide(currentSlide - 1);

  const switchVisualMode = async (newMode) => {
    setVisualMode(newMode);
    
    const updatedSlides = slides.map((slide, index) => ({
      ...slide,
      visuals: {
        ...slide.visuals,
        currentDisplay: newMode === 'viral' 
          ? (slide.visuals.viralVariant || slide.visuals.primary)
          : slide.visuals.primary
      }
    }));
    
    setSlides(updatedSlides);
  };

  const toggleAudio = (slideIndex) => {
    const slide = slides[slideIndex];
    if (!slide?.audio?.narrationUrl) return;

    if (audioRef.current) {
      if (slide.audio.enabled) {
        audioRef.current.pause();
      } else {
        audioRef.current.src = slide.audio.narrationUrl;
        audioRef.current.play();
      }
    }

    const updatedSlides = [...slides];
    updatedSlides[slideIndex].audio.enabled = !updatedSlides[slideIndex].audio.enabled;
    setSlides(updatedSlides);
  };

  const exportSlideDeck = () => {
    const exportData = {
      title: sourceContent.title || 'Slide Deck',
      generatedAt: new Date().toISOString(),
      totalSlides: slides.length,
      visualMode: visualMode,
      slides: slides.map(slide => ({
        title: slide.title,
        content: slide.content,
        keyPoints: slide.keyPoints,
        visualUrl: slide.visuals?.currentDisplay,
        audioUrl: slide.audio?.narrationUrl,
        metadata: slide.metadata
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `slide-deck-${Date.now()}.json`;
    a.click();
  };

  useEffect(() => {
    if (sourceContent) {
      generateSlideDeck();
    }
  }, [sourceContent]);

  if (!slides.length) {
    return (
      <div className="slide-deck-loading">
        <p>Generating enhanced slide deck with AI visuals...</p>
      </div>
    );
  }

  const currentSlideData = slides[currentSlide];

  return (
    <div className="enhanced-slide-deck">
      <div className="slide-controls-top">
        <div className="visual-mode-selector">
          <button 
            onClick={() => switchVisualMode('standard')}
            className={visualMode === 'standard' ? 'active' : ''}
          >
            Standard
          </button>
          <button 
            onClick={() => switchVisualMode('viral')}
            className={visualMode === 'viral' ? 'active' : ''}
          >
            Viral/Engaging
          </button>
        </div>

        <div className="slide-metadata">
          <span>Slide {currentSlide + 1} of {slides.length}</span>
        </div>

        <button onClick={exportSlideDeck} className="export-button">
          Export Deck
        </button>
      </div>

      <div className="slide-display">
        {currentSlideData.visuals?.currentDisplay ? (
          <div 
            className="slide-visual"
            style={{
              backgroundImage: `url(${currentSlideData.visuals.currentDisplay})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            <div className="slide-content-overlay">
              {currentSlideData.title && (
                <h1 className="slide-title">{currentSlideData.title}</h1>
              )}
              
              {currentSlideData.keyPoints && (
                <ul className="slide-key-points">
                  {currentSlideData.keyPoints.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <div className="slide-text-only">
            <h1>{currentSlideData.title}</h1>
            <div className="slide-content">{currentSlideData.content}</div>
            {currentSlideData.keyPoints && (
              <ul>
                {currentSlideData.keyPoints.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {currentSlideData.audio?.narrationUrl && (
          <button 
            className="audio-control"
            onClick={() => toggleAudio(currentSlide)}
          >
            {currentSlideData.audio.enabled ? '🔊 Pause' : '🔇 Play Narration'}
          </button>
        )}

        <audio ref={audioRef} />
      </div>

      <div className="slide-navigation">
        <button 
          onClick={previousSlide}
          disabled={currentSlide === 0}
          className="nav-button prev"
        >
          ← Previous
        </button>

        <div className="slide-thumbnails">
          {slides.map((slide, index) => (
            <div
              key={index}
              className={`thumbnail ${index === currentSlide ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
            >
              {slide.visuals?.currentDisplay ? (
                <img src={slide.visuals.currentDisplay} alt={`Slide ${index + 1}`} />
              ) : (
                <div className="thumbnail-placeholder">{index + 1}</div>
              )}
            </div>
          ))}
        </div>

        <button 
          onClick={nextSlide}
          disabled={currentSlide === slides.length - 1}
          className="nav-button next"
        >
          Next →
        </button>
      </div>

      {loading && (
        <div className="loading-overlay">
          <p>Enhancing slides with AI visuals and audio...</p>
        </div>
      )}
    </div>
  );
};

export default EnhancedSlideDeckPanel;
