
import React, { useEffect, useRef, useState } from 'react';
import { GeneratedOutput, OutputType } from '../types';
import Button from './Shared/Button';
import { ArrowDownTrayIcon, ShareIcon, BookmarkIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { OUTPUT_METADATA } from '../constants';
import { generateInfographicFluxVisuals, generateSlideDeckFluxVisuals } from '../utils/pollinations-flux';
import { API_ENDPOINTS } from '../config';
import { generateFluxImageAuth } from '../utils/pollinations-auth-client';

interface OutputViewerProps {
  output: GeneratedOutput;
  onSave: () => void;
  onExport: () => void;
  onShare: () => void;
}

const COLORS = ['#64ffda', '#4fd1c5', '#38b2ac', '#2c7a7b', '#234e52'];

const OutputViewer: React.FC<OutputViewerProps> = ({ output, onSave, onExport, onShare }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const loggedSlidesRef = useRef<Set<number>>(new Set());
  const [slideLoadState, setSlideLoadState] = useState<Record<number, 'loading' | 'loaded' | 'error'>>({});
  const [slideObjectUrls, setSlideObjectUrls] = useState<Record<number, string>>({});
  const [accentImageUrl, setAccentImageUrl] = useState<string | null>(null);
  const [accentImageError, setAccentImageError] = useState(false);
  const [accentImageErrorMessage, setAccentImageErrorMessage] = useState<string | null>(null);
  const [infographicFluxVisuals, setInfographicFluxVisuals] = useState<{ label: string; imageUrl: string }[]>([]);
  const [slideFluxVisuals, setSlideFluxVisuals] = useState<{ label: string; imageUrl: string }[]>([]);
  const [narrationUrl, setNarrationUrl] = useState<string | null>(null);
  const [narrationLoading, setNarrationLoading] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  const buildSlidePlaceholder = (title: string) => {
    const safeTitle = title || 'Slide image';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="#0a192f"/><rect x="80" y="80" width="1120" height="560" rx="24" fill="#112240" stroke="#233554" stroke-width="2"/><text x="140" y="200" fill="#64ffda" font-family="Arial, sans-serif" font-size="36" font-weight="700">Image unavailable</text><text x="140" y="260" fill="#8892b0" font-family="Arial, sans-serif" font-size="24">${safeTitle}</text></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  const decodeInlineSvg = (value: string) => {
    if (!/^data:image\/svg\+xml/i.test(value)) {
      return null;
    }
    const commaIndex = value.indexOf(',');
    if (commaIndex === -1) {
      return null;
    }
    const rawData = value.slice(commaIndex + 1);
    if (/;base64,/i.test(value)) {
      try {
        return atob(rawData);
      } catch {
        return null;
      }
    }
    try {
      return decodeURIComponent(rawData);
    } catch {
      return null;
    }
  };

  const buildAccentPrompt = (title: string, type: OutputType) => {
    const safeTitle = title || 'Learning Studio';
    if (type === OutputType.PODCAST) {
      return `Editorial podcast cover, modern studio ambience, teal and green accents, crisp typography, title: ${safeTitle}`;
    }
    if (type === OutputType.REPORT) {
      return `Clean editorial report cover, modern academic style, teal and green accents, title: ${safeTitle}`;
    }
    return `Study notes cover, clean layout, modern minimalist, teal and green accents, title: ${safeTitle}`;
  };

  const renderAccent = () => {
    if (accentImageErrorMessage && (!accentImageUrl || accentImageError)) {
      return (
        <div className="bg-[#0a192f]/30 rounded-2xl border border-[#233554]/50 p-4 text-[11px] text-[#fbbf24]">
          Authenticated image generation failed. {accentImageErrorMessage}
        </div>
      );
    }
    if (!accentImageUrl || accentImageError) return null;
    return (
      <div className="bg-[#0a192f]/30 rounded-2xl border border-[#233554]/50 p-4">
        <img
          src={accentImageUrl}
          alt="Cover visual"
          loading="lazy"
          className="w-full h-auto rounded-xl border border-[#233554]/50"
          onError={() => setAccentImageError(true)}
        />
      </div>
    );
  };

  useEffect(() => {
    if (output.audioUrl && audioRef.current) {
      audioRef.current.src = output.audioUrl;
      audioRef.current.load();
    }
  }, [output.audioUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const renderSpeedControl = () => (
    <label className="text-[10px] uppercase tracking-widest text-[#64ffda] flex items-center gap-2">
      Speed
      <select
        value={playbackRate}
        onChange={(event) => setPlaybackRate(Number(event.target.value))}
        className="bg-[#0a192f] border border-[#233554] text-[#ccd6f6] rounded px-2 py-1 text-[11px]"
      >
        <option value={0.75}>0.75x</option>
        <option value={1}>1x</option>
        <option value={1.25}>1.25x</option>
        <option value={1.5}>1.5x</option>
        <option value={1.75}>1.75x</option>
        <option value={2}>2x</option>
      </select>
    </label>
  );

  useEffect(() => {
    setNarrationUrl(null);
    setNarrationLoading(false);
  }, [output.id]);

  const buildNarrationText = () => {
    if (output.type === OutputType.SLIDEDECK && Array.isArray(output.slidePlan)) {
      return output.slidePlan
        .map((slide: any, idx: number) => {
          const title = slide.title || `Slide ${idx + 1}`;
          const bullets = Array.isArray(slide.bullets) ? slide.bullets : [];
          const notes = slide.notes ? `Notes: ${slide.notes}` : '';
          return [`Slide ${idx + 1}: ${title}`, ...bullets, notes].filter(Boolean).join('\n');
        })
        .join('\n\n');
    }

    if (output.type === OutputType.INFOGRAPHIC && output.analysis) {
      const title = output.analysis.title ? `Title: ${output.analysis.title}` : '';
      const facts = Array.isArray(output.analysis.key_facts)
        ? output.analysis.key_facts.map((fact: string, idx: number) => `Key point ${idx + 1}: ${fact}`)
        : [];
      const stats = Array.isArray(output.analysis.statistics)
        ? output.analysis.statistics.map((stat: any) => `Stat: ${stat.label} ${stat.value}`)
        : [];
      const themes = Array.isArray(output.analysis.themes)
        ? `Themes: ${output.analysis.themes.join(', ')}`
        : '';
      return [title, ...facts, ...stats, themes].filter(Boolean).join('\n');
    }

    return typeof output.content === 'string' ? output.content : '';
  };

  const handleGenerateNarration = async () => {
    const text = buildNarrationText();
    if (!text.trim()) return;
    setNarrationLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.TTS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, prefix: 'visual' })
      });
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setNarrationUrl(`${API_ENDPOINTS.AUDIO}/${data.audio_filename}`);
    } catch (error) {
      console.error('Narration generation failed:', error);
      setNarrationUrl(null);
    } finally {
      setNarrationLoading(false);
    }
  };
  useEffect(() => {
    let cancelled = false;
    const supportsAccent = [
      OutputType.REPORT,
      OutputType.PODCAST,
      OutputType.BASELINE
    ].includes(output.type);

    if (!supportsAccent) {
      setAccentImageUrl(null);
      setAccentImageError(false);
      return;
    }

    setAccentImageError(false);
    (async () => {
      const prompt = buildAccentPrompt(output.title, output.type);
      const url = await generateFluxImageAuth(prompt, {
        width: 1600,
        height: 420,
        enhance: true,
        model: 'flux'
      });
      if (!cancelled) {
        setAccentImageUrl(url);
        setAccentImageErrorMessage(null);
      }
    })().catch((error) => {
      if (!cancelled) {
        setAccentImageUrl(null);
        setAccentImageErrorMessage(
          error instanceof Error ? error.message : 'Authenticated image generation failed.'
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [output.type, output.title]);

  useEffect(() => {
    let cancelled = false;
    const theme = 'blue grey teal green silver';

    if (output.type === OutputType.INFOGRAPHIC && output.analysis) {
      generateInfographicFluxVisuals(output.analysis, theme)
        .then((visuals) => {
          if (!cancelled) setInfographicFluxVisuals(visuals);
        })
        .catch(() => {
          if (!cancelled) setInfographicFluxVisuals([]);
        });
    } else {
      setInfographicFluxVisuals([]);
    }

    if (output.type === OutputType.SLIDEDECK && Array.isArray(output.slidePlan)) {
      generateSlideDeckFluxVisuals(output.slidePlan, theme)
        .then((visuals) => {
          if (!cancelled) setSlideFluxVisuals(visuals);
        })
        .catch(() => {
          if (!cancelled) setSlideFluxVisuals([]);
        });
    } else {
      setSlideFluxVisuals([]);
    }

    return () => {
      cancelled = true;
    };
  }, [output.type, output.analysis, output.slidePlan]);

  useEffect(() => {
    if (output.type !== OutputType.SLIDEDECK || !Array.isArray(output.content)) {
      return;
    }
    const initialState: Record<number, 'loading' | 'loaded' | 'error'> = {};
    output.content.forEach((_, idx) => {
      initialState[idx] = 'loading';
    });
    setSlideLoadState(initialState);
  }, [output.type, output.content]);

  useEffect(() => {
    if (output.type !== OutputType.SLIDEDECK || !Array.isArray(output.content)) {
      setSlideObjectUrls({});
      return;
    }
    const markLoaded: Record<number, boolean> = {};
    const nextUrls: Record<number, string> = {};
    output.content.forEach((url: string, idx: number) => {
      if (typeof url !== 'string') return;
      const trimmed = url.trim();

      // Check if it's an inline SVG (not base64)
      if (/^data:image\/svg\+xml/i.test(trimmed) && !/;base64,/i.test(trimmed)) {
        const commaIndex = trimmed.indexOf(',');
        if (commaIndex !== -1) {
          const rawData = trimmed.slice(commaIndex + 1);
          try {
            const decoded = decodeURIComponent(rawData);
            const blob = new Blob([decoded], { type: 'image/svg+xml' });
            nextUrls[idx] = URL.createObjectURL(blob);
            markLoaded[idx] = true;
          } catch {
            // Leave as-is if decoding fails.
          }
        }
      }

      // Also check for inline SVG that can be rendered directly
      const inlineSvg = decodeInlineSvg(trimmed);
      if (inlineSvg) {
        // Inline SVGs are immediately available, mark as loaded
        markLoaded[idx] = true;
      }
    });
    setSlideObjectUrls(nextUrls);
    if (Object.keys(markLoaded).length > 0) {
      setSlideLoadState((prev) => {
        const updated = { ...prev };
        Object.entries(markLoaded).forEach(([k, v]) => {
          if (v) updated[Number(k)] = 'loaded';
        });
        return updated;
      });
    }
    return () => {
      Object.values(nextUrls).forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
    };
  }, [output.type, output.content]);

  const renderContent = () => {
    switch (output.type) {
      case OutputType.INFOGRAPHIC:
        const pieData = [
          { name: 'Themes', value: 35 },
          { name: 'Interpretations', value: 25 },
          { name: 'Inquiries', value: 20 },
          { name: 'Insights', value: 20 },
        ];
        const infographicUrl = typeof output.content === 'string' && /^(https?:\/\/|data:image\/)/i.test(output.content)
          ? output.content
          : '';
        const infographicInlineSvg = infographicUrl ? decodeInlineSvg(infographicUrl) : null;
        return (
          <div className="space-y-8 animate-in fade-in duration-700">
            {infographicFluxVisuals.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="uppercase tracking-widest text-[9px] text-[#495670]">Concept Tiles</div>
                  <button
                    onClick={handleGenerateNarration}
                    disabled={narrationLoading}
                    className="text-[10px] uppercase tracking-widest text-[#64ffda] hover:text-[#22d3ee] border border-[#233554] px-3 py-1 rounded-full"
                  >
                    {narrationLoading ? 'Generating Narration...' : 'Generate Narration'}
                  </button>
                </div>
                  {narrationUrl && (
                    <div className="bg-[#0a192f]/30 rounded-xl border border-[#233554]/50 p-3">
                      <audio ref={audioRef} controls className="w-full h-8 accent-[#64ffda]" src={narrationUrl} />
                      <div className="mt-2 flex justify-end">
                        {renderSpeedControl()}
                      </div>
                    </div>
                  )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {infographicFluxVisuals.map((visual) => (
                    <div key={visual.label} className="bg-[#0a192f]/30 rounded-xl border border-[#233554]/50 p-4">
                      <div className="text-[10px] uppercase tracking-widest text-[#8892b0] mb-2">
                        {visual.label}
                      </div>
                      <img
                        src={visual.imageUrl}
                        alt={visual.label}
                        className="w-full h-auto rounded-lg border border-[#233554]/40"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!infographicFluxVisuals.length && infographicUrl && (
              <div className="flex items-center justify-center bg-[#0a192f]/30 rounded-2xl border border-[#233554]/50 p-4">
                {infographicInlineSvg ? (
                  <div
                    className="max-w-full w-full rounded-xl border border-[#233554]/50"
                    dangerouslySetInnerHTML={{ __html: infographicInlineSvg }}
                  />
                ) : (
                  <img src={infographicUrl} alt="Infographic" className="max-w-full h-auto rounded-xl border border-[#233554]/50" />
                )}
              </div>
            )}
            {output.prompt && (
              <div className="text-[11px] text-[#8892b0] border border-[#233554]/50 rounded-xl p-4 bg-[#0a192f]/40">
                <div className="uppercase tracking-widest text-[9px] text-[#495670] mb-2">Prompt</div>
                <p className="whitespace-pre-wrap">{output.prompt}</p>
              </div>
            )}
            {output.analysis && (
              <div className="text-[11px] text-[#8892b0] border border-[#233554]/50 rounded-xl p-4 bg-[#0a192f]/40 space-y-3">
                <div className="uppercase tracking-widest text-[9px] text-[#495670]">Analysis</div>
                {output.analysis.title && (
                  <div className="text-[#ccd6f6] text-sm font-semibold">{output.analysis.title}</div>
                )}
                {Array.isArray(output.analysis.key_facts) && output.analysis.key_facts.length > 0 && (
                  <div>
                    <div className="uppercase tracking-widest text-[9px] text-[#495670] mb-1">Key Facts</div>
                    <ul className="list-disc list-inside space-y-1">
                      {output.analysis.key_facts.map((fact: string, idx: number) => (
                        <li key={idx}>{fact}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {Array.isArray(output.analysis.statistics) && output.analysis.statistics.length > 0 && (
                  <div>
                    <div className="uppercase tracking-widest text-[9px] text-[#495670] mb-1">Statistics</div>
                    <div className="grid grid-cols-2 gap-2">
                      {output.analysis.statistics.map((stat: any, idx: number) => (
                        <div key={idx} className="border border-[#233554]/60 rounded-lg p-2">
                          <div className="text-[#64ffda] font-semibold">{stat.value}</div>
                          <div className="text-[#8892b0] text-[10px]">{stat.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {Array.isArray(output.analysis.themes) && output.analysis.themes.length > 0 && (
                  <div>
                    <div className="uppercase tracking-widest text-[9px] text-[#495670] mb-1">Themes</div>
                    <div className="flex flex-wrap gap-2">
                      {output.analysis.themes.map((theme: string, idx: number) => (
                        <span key={idx} className="px-2 py-1 rounded-full border border-[#233554]/60 text-[10px] text-[#64ffda]">
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="h-64 w-full min-w-[300px] flex items-center justify-center bg-[#0a192f]/30 rounded-2xl border border-[#233554]/50">
              <PieChart width={320} height={240}>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#112240', border: '1px solid #233554', borderRadius: '8px' }}
                  itemStyle={{ color: '#ccd6f6' }}
                />
              </PieChart>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {pieData.map((item, idx) => (
                <div key={item.name} className="p-4 bg-[#112240]/50 rounded-lg border border-[#233554]/30">
                  <div className="text-[10px] uppercase tracking-widest text-[#495670] mb-1">{item.name}</div>
                  <div className="text-[#64ffda] font-bold">{item.value}%</div>
                </div>
              ))}
            </div>
            <div className="prose prose-invert max-w-none text-[#8892b0]">
              {typeof output.content === 'string' && !/^(https?:\/\/|data:image\/)/i.test(output.content)
                ? output.content
                : 'Data synthesis pending...'}
            </div>
          </div>
        );
      case OutputType.PODCAST:
        return (
          <div className="space-y-6">
            {renderAccent()}
            <div className="p-8 bg-[#112240] rounded-2xl border border-[#64ffda]/20 flex flex-col items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-[#64ffda]/10 flex items-center justify-center text-[#64ffda] animate-pulse">
                <SpeakerWaveIcon className="w-10 h-10" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-[#ccd6f6]">Alex & Sam's Discussion</h3>
                <p className="text-[#8892b0] text-sm mt-1 italic">Reflecting on your source material</p>
              </div>
              {output.audioUrl ? (
                <div className="w-full max-w-md space-y-2">
                  <audio ref={audioRef} controls className="w-full accent-[#64ffda]" />
                  <div className="flex justify-end">
                    {renderSpeedControl()}
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-md text-center text-xs text-[#8892b0]">
                  Audio unavailable for this generation.
                </div>
              )}
            </div>
            <div className="prose prose-invert max-w-none text-[#8892b0] whitespace-pre-wrap font-mono text-sm p-6 bg-[#0a192f] rounded-xl border border-[#233554]">
              {typeof output.content === 'string' ? output.content : ''}
            </div>
          </div>
        );
      case OutputType.REPORT:
      case OutputType.BASELINE:
        return (
          <div className="space-y-6">
            {renderAccent()}
            <div className="prose prose-invert max-w-none text-[#8892b0] whitespace-pre-wrap">
              {typeof output.content === 'string' ? output.content : 'Content synthesis available soon.'}
            </div>
          </div>
        );
      case OutputType.SLIDEDECK:
        if (Array.isArray(output.content)) {
          const plan = Array.isArray(output.slidePlan) ? output.slidePlan : [];
          if (slideFluxVisuals.length > 0) {
            return (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="uppercase tracking-widest text-[9px] text-[#495670]">Storyboard</div>
                  <button
                    onClick={handleGenerateNarration}
                    disabled={narrationLoading}
                    className="text-[10px] uppercase tracking-widest text-[#64ffda] hover:text-[#22d3ee] border border-[#233554] px-3 py-1 rounded-full"
                  >
                    {narrationLoading ? 'Generating Narration...' : 'Generate Narration'}
                  </button>
                </div>
                  {narrationUrl && (
                    <div className="bg-[#0a192f]/30 rounded-xl border border-[#233554]/50 p-3">
                      <audio ref={audioRef} controls className="w-full h-8 accent-[#64ffda]" src={narrationUrl} />
                      <div className="mt-2 flex justify-end">
                        {renderSpeedControl()}
                      </div>
                    </div>
                  )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {slideFluxVisuals.map((visual, idx) => {
                    const meta = plan[idx] || {};
                    const title = meta.title || `Scene ${idx + 1}`;
                    const bullets: string[] = Array.isArray(meta.bullets) ? meta.bullets : [];
                    const notes = meta.notes || '';
                    return (
                      <div key={`${idx}-${title}`} className="bg-[#0a192f]/40 rounded-2xl border border-[#233554]/50 p-4 space-y-3">
                        <div className="text-xs uppercase tracking-widest text-[#495670]">{title}</div>
                        <img
                          src={visual.imageUrl}
                          alt={title}
                          loading="lazy"
                          className="w-full h-auto rounded-xl border border-[#233554]/50"
                        />
                        {(bullets.length > 0 || notes) && (
                          <div className="text-xs text-[#ccd6f6] space-y-2">
                            {bullets.length > 0 && (
                              <ul className="list-disc list-inside space-y-1">
                                {bullets.map((b, i) => (
                                  <li key={i}>{b}</li>
                                ))}
                              </ul>
                            )}
                            {notes && (
                              <div className="text-[#8892b0] italic whitespace-pre-wrap">
                                {notes}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }
          return (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {output.content.map((url: string, idx: number) => {
                  const meta = plan[idx] || {};
                  const title = meta.title || `Slide ${idx + 1}`;
                  const notes = meta.notes || '';
                  const bullets: string[] = Array.isArray(meta.bullets) ? meta.bullets : [];
                  const prompt = typeof meta.image_prompt === 'string' ? meta.image_prompt : '';
                  const fallbackSrc = buildSlidePlaceholder(title);
                  const imageUrl = typeof url === 'string' && url.trim() ? url : fallbackSrc;
                  const resolvedUrl = slideObjectUrls[idx] || imageUrl;
                  const inlineSvg = decodeInlineSvg(imageUrl);
                  const loadState = inlineSvg ? 'loaded' : (slideLoadState[idx] || 'loading');
                  if (inlineSvg && !loggedSlidesRef.current.has(idx)) {
                    loggedSlidesRef.current.add(idx);
                    console.debug('[SlideDeck] Inline SVG used', {
                      index: idx + 1,
                      title,
                      srcPrefix: imageUrl.slice(0, 40),
                      srcLength: imageUrl.length
                    });
                  }
                  return (
                    <div key={`${idx}-${title}`} className="bg-[#0a192f]/40 rounded-2xl border border-[#233554]/50 p-4 space-y-3">
                      <div className="text-xs uppercase tracking-widest text-[#495670]">{title}</div>
                      <div
                        className="relative w-full overflow-hidden rounded-xl border border-[#233554]/50 bg-[#0a192f]"
                        style={{ paddingTop: '56.25%' }}
                      >
                        {loadState !== 'loaded' && (
                          <div className="absolute inset-0 flex items-center justify-center bg-[#0a192f]/70 text-xs text-[#8892b0] animate-pulse">
                            {loadState === 'error' ? 'Image failed to load' : 'Loading image...'}
                          </div>
                        )}
                        {inlineSvg ? (
                          <div
                            className={`absolute inset-0 w-full h-full ${loadState === 'loaded' ? 'opacity-100' : 'opacity-60'}`}
                            dangerouslySetInnerHTML={{ __html: inlineSvg }}
                          />
                        ) : (
                          <img
                            src={resolvedUrl}
                            alt={title}
                            loading="lazy"
                            className={`absolute inset-0 w-full h-full object-contain ${loadState === 'loaded' ? 'opacity-100' : 'opacity-60'}`}
                            onLoad={() => {
                              setSlideLoadState((prev) => ({ ...prev, [idx]: 'loaded' }));
                            }}
                            onError={(event) => {
                              const target = event.currentTarget;
                              if (target.dataset.fallbackApplied) return;
                              target.dataset.fallbackApplied = 'true';
                              target.src = fallbackSrc;
                              console.warn('[SlideDeck] Image load failed', {
                                index: idx + 1,
                                title,
                                src: resolvedUrl
                              });
                              setSlideLoadState((prev) => ({ ...prev, [idx]: 'error' }));
                            }}
                          />
                        )}
                      </div>
                      {(bullets.length > 0 || notes) && (
                        <div className="text-xs text-[#ccd6f6] space-y-2">
                          {bullets.length > 0 && (
                            <ul className="list-disc list-inside space-y-1">
                              {bullets.map((b, i) => (
                                <li key={i}>{b}</li>
                              ))}
                            </ul>
                          )}
                          {notes && (
                            <div className="text-[#8892b0] italic whitespace-pre-wrap">
                              {notes}
                            </div>
                          )}
                        </div>
                      )}
                      {slideFluxVisuals[idx] && (
                        <div className="text-[11px] text-[#8892b0] border-t border-[#233554]/60 pt-3 space-y-2">
                          <span className="uppercase tracking-widest text-[9px] text-[#495670]">Flux Visual</span>
                          <img
                            src={slideFluxVisuals[idx].imageUrl}
                            alt={`${title} flux visual`}
                            className="w-full h-auto rounded-lg border border-[#233554]/40"
                          />
                        </div>
                      )}
                      {prompt && (
                        <div className="text-[11px] text-[#8892b0] border-t border-[#233554]/60 pt-3">
                          <span className="uppercase tracking-widest text-[9px] text-[#495670]">Prompt</span>
                          <p className="mt-2 whitespace-pre-wrap">{prompt}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {output.prompt && (
                <div className="text-[11px] text-[#8892b0] border border-[#233554]/50 rounded-xl p-4 bg-[#0a192f]/40">
                  <div className="uppercase tracking-widest text-[9px] text-[#495670] mb-2">Deck Prompt</div>
                  <p className="whitespace-pre-wrap">{output.prompt}</p>
                </div>
              )}
              {output.analysis && (
                <div className="text-[11px] text-[#8892b0] border border-[#233554]/50 rounded-xl p-4 bg-[#0a192f]/40 space-y-3">
                  <div className="uppercase tracking-widest text-[9px] text-[#495670]">Deck Analysis</div>
                  {output.analysis.title && (
                    <div className="text-[#ccd6f6] text-sm font-semibold">{output.analysis.title}</div>
                  )}
                  {Array.isArray(output.analysis.key_facts) && output.analysis.key_facts.length > 0 && (
                    <div>
                      <div className="uppercase tracking-widest text-[9px] text-[#495670] mb-1">Key Slides</div>
                      <ul className="list-disc list-inside space-y-1">
                        {output.analysis.key_facts.map((fact: string, idx: number) => (
                          <li key={idx}>{fact}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {Array.isArray(output.analysis.themes) && output.analysis.themes.length > 0 && (
                    <div>
                      <div className="uppercase tracking-widest text-[9px] text-[#495670] mb-1">Themes</div>
                      <div className="flex flex-wrap gap-2">
                        {output.analysis.themes.map((theme: string, idx: number) => (
                          <span key={idx} className="px-2 py-1 rounded-full border border-[#233554]/60 text-[10px] text-[#64ffda]">
                            {theme}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {output.analysis.narrative && (
                    <div>
                      <div className="uppercase tracking-widest text-[9px] text-[#495670] mb-1">Narrative Arc</div>
                      <div className="space-y-2">
                        {output.analysis.narrative.opening && (
                          <div><span className="text-[#64ffda]">Opening:</span> {output.analysis.narrative.opening}</div>
                        )}
                        {Array.isArray(output.analysis.narrative.middle) && output.analysis.narrative.middle.length > 0 && (
                          <div><span className="text-[#64ffda]">Middle:</span> {output.analysis.narrative.middle.join(' · ')}</div>
                        )}
                        {output.analysis.narrative.closing && (
                          <div><span className="text-[#64ffda]">Closing:</span> {output.analysis.narrative.closing}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {output.analysis && Array.isArray(output.analysis.sequence) && output.analysis.sequence.length > 0 && (
                <div className="text-[11px] text-[#8892b0] border border-[#233554]/50 rounded-xl p-4 bg-[#0a192f]/40 space-y-3">
                  <div className="uppercase tracking-widest text-[9px] text-[#495670]">Sequence</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {output.analysis.sequence.map((item: any) => (
                      <div key={item.index} className="border border-[#233554]/60 rounded-lg p-3 bg-[#112240]/40">
                        <div className="text-[9px] uppercase tracking-widest text-[#495670]">Slide {item.index}</div>
                        <div className="text-[#ccd6f6] text-sm font-semibold">{item.title}</div>
                        {item.summary && <div className="mt-1 text-[#8892b0]">{item.summary}</div>}
                        {item.layout_hint && <div className="mt-2 text-[10px] text-[#64ffda]">Layout: {item.layout_hint}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        }
        return (
          <div className="prose prose-invert max-w-none">
            <div className="text-[#ccd6f6] leading-relaxed whitespace-pre-wrap">
              {typeof output.content === 'string' ? output.content : 'Content synthesis available soon.'}
            </div>
          </div>
        );
      default:
        return (
          <div className="prose prose-invert max-w-none">
            <div className="text-[#ccd6f6] leading-relaxed whitespace-pre-wrap">
              {typeof output.content === 'string' ? output.content : 'Content synthesis available soon.'}
            </div>
          </div>
        );
    }
  };

  return (
    <div ref={viewerRef} className="max-w-4xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-[#233554]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-[#64ffda]/5 text-[#64ffda] rounded-lg">
               {OUTPUT_METADATA[output.type].icon}
             </div>
             <h2 className="text-3xl font-bold tracking-tight text-[#ccd6f6]">{output.title}</h2>
          </div>
          <p className="text-[#8892b0] text-sm italic">Generated on {new Date(output.timestamp).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onSave} className="!p-3"><BookmarkIcon className="w-5 h-5" /></Button>
          <Button variant="secondary" onClick={onExport} className="!p-3"><ArrowDownTrayIcon className="w-5 h-5" /></Button>
          <Button variant="primary" onClick={onShare} className="!p-3"><ShareIcon className="w-5 h-5" /></Button>
        </div>
      </div>

      <div className="bg-[#112240]/40 p-8 rounded-2xl border border-[#233554] shadow-2xl backdrop-blur-sm">
        {output.audioUrl && output.type !== OutputType.PODCAST && (
          <div className="mb-8 p-4 bg-[#64ffda]/5 rounded-xl border border-[#64ffda]/10 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-3 text-[#64ffda] flex-shrink-0">
               <SpeakerWaveIcon className="w-5 h-5" />
               <span className="text-xs font-bold uppercase tracking-widest">Narration</span>
            </div>
            <div className="w-full space-y-2">
              <audio ref={audioRef} controls className="w-full h-8 accent-[#64ffda]" />
              <div className="flex justify-end">
                {renderSpeedControl()}
              </div>
            </div>
          </div>
        )}
        
        {renderContent()}
      </div>
    </div>
  );
};

export default OutputViewer;
