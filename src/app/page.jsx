"use client";

import React, { useState, useEffect, useRef } from "react";
import { SURAHS } from "@/data/surahs";
import { ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";

export default function QuranPage() {
  const [page, setPage] = useState(1);
  const [verses, setVerses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Interactive UI states
  const [activeWordId, setActiveWordId] = useState(null);
  const [activeVerseKey, setActiveVerseKey] = useState(null);
  const [selectedWord, setSelectedWord] = useState(null);
  const [isPlayingWord, setIsPlayingWord] = useState(false);
  const [isVerseHidden, setIsVerseHidden] = useState(false);
  const [revealedVerseKeys, setRevealedVerseKeys] = useState(new Set());

  // Search & Navigation States
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const audioRef = useRef(null);

  // Fetch page data from our Next.js API route
  useEffect(() => {
    let active = true;
    async function fetchPage() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/quran?page=${page}`);
        if (!res.ok) throw new Error("Gagal mengambil data halaman Quran.");
        const data = await res.json();
        if (active) {
          setVerses(data.verses || []);
        }
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    fetchPage();
    return () => {
      active = false;
    };
  }, [page, retryCount]);

  // Determine current page's Juz and Surahs
  const currentSurahs = [];
  let currentJuz = 1;
  if (verses.length > 0) {
    currentJuz = verses[0].juz_number;
    verses.forEach((verse) => {
      const sId = parseInt(verse.verse_key.split(":")[0]);
      if (!currentSurahs.includes(sId)) {
        currentSurahs.push(sId);
      }
    });
  }

  // Update search query to reflect the main surah on the current page
  useEffect(() => {
    if (currentSurahs.length > 0) {
      const primarySurah = SURAHS[currentSurahs[0]];
      if (primarySurah) {
        setSearchQuery(primarySurah.name);
      }
    }
  }, [page, currentSurahs.join(",")]);

  // Click outside to close searchable Surah dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filtered surahs based on search query
  const filteredSurahs = Object.entries(SURAHS).filter(([id, surah]) => {
    return (
      surah.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      surah.translation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      id.toString() === searchQuery
    );
  });

  // Calculate special lines (Surah Headers and Bismillahs)
  const specialLines = {};
  verses.forEach((verse) => {
    if (verse.verse_number === 1) {
      const surahId = parseInt(verse.verse_key.split(":")[0]);
      const lineNums = verse.words.map((w) => w.line_number);
      const startLine = Math.min(...lineNums);

      if (surahId === 1) {
        specialLines[1] = { type: "header", surahId };
      } else {
        if (surahId !== 9) {
          specialLines[startLine - 1] = { type: "bismillah", surahId };
          specialLines[startLine - 2] = { type: "header", surahId };
        } else {
          specialLines[startLine - 1] = { type: "header", surahId };
        }
      }
    }
  });

  // Group words by line_number (1 to 15)
  const lines = Array.from({ length: 15 }, (_, i) => i + 1).map((lineNum) => {
    const lineWords = [];
    verses.forEach((verse) => {
      verse.words.forEach((word) => {
        if (word.line_number === lineNum) {
          lineWords.push({
            ...word,
            verse_key: verse.verse_key,
            verse_number: verse.verse_number,
          });
        }
      });
    });
    return { lineNum, words: lineWords };
  });

  // Play audio for a word
  const playWordAudio = (url) => {
    if (!url) return;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const fullUrl = `https://audio.qurancdn.com/${url}`;
    const audio = new Audio(fullUrl);
    audioRef.current = audio;
    setIsPlayingWord(true);
    audio.play().catch(() => setIsPlayingWord(false));
    audio.onended = () => setIsPlayingWord(false);
  };

  const handleWordClick = (word) => {
    setSelectedWord(word);
    setActiveWordId(word.id);
    setActiveVerseKey(word.verse_key);
    if (word.audio_url) {
      playWordAudio(word.audio_url);
    }
  };

  // Toggle hide/show all — always resets per-verse revealed state
  const handleToggleHide = () => {
    setIsVerseHidden((v) => !v);
    setRevealedVerseKeys(new Set());
  };

  // Reveal next hidden verse one by one (in order)
  const handleRevealNext = () => {
    const nextVerse = verses.find((v) => !revealedVerseKeys.has(v.verse_key));
    if (nextVerse) {
      setRevealedVerseKeys((prev) => new Set([...prev, nextVerse.verse_key]));
    }
  };

  const allRevealed =
    isVerseHidden &&
    verses.length > 0 &&
    verses.every((v) => revealedVerseKeys.has(v.verse_key));

  // When all verses are revealed one-by-one, auto-transition to fully-visible state
  useEffect(() => {
    if (allRevealed) {
      setIsVerseHidden(false);
      setRevealedVerseKeys(new Set());
    }
  }, [allRevealed]);

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 flex flex-row gap-2 items-center justify-between px-2 md:px-6 py-2 md:py-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 md:w-10 h-8 md:h-10 rounded-lg bg-emerald-600 dark:bg-emerald-700 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-500/20">
            S
          </div>
          <div className="hidden md:block">
            <h1 className="text-sm md:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Sabbit Quran
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Mushaf Madinah Utsmani 1441 H
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Surah Selector (Searchable Dropdown) */}
          <div className="relative" ref={dropdownRef}>
            <input
              type="text"
              placeholder="Cari Surah..."
              value={searchQuery}
              onFocus={() => setIsDropdownOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              className="w-40 md:w-48 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
            />
            {isDropdownOpen && (
              <div className="absolute left-0 mt-1 w-60 max-h-60 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl z-50 py-1 scrollbar-thin">
                {filteredSurahs.length > 0 ? (
                  filteredSurahs.map(([id, surah]) => (
                    <button
                      key={id}
                      onClick={() => {
                        setPage(surah.startPage);
                        setSearchQuery(surah.name);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs md:text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex justify-between items-center transition-colors"
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {id}. {surah.name}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          {surah.translation} (Hlm {surah.startPage})
                        </span>
                      </div>
                      <span className="font-amiri text-sm text-emerald-600 dark:text-emerald-450">
                        {surah.arabic}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-zinc-450 dark:text-zinc-500 italic">
                    Tidak ditemukan
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs md:text-sm font-medium text-zinc-600 dark:text-zinc-300 hidden sm:inline">
              Halaman
            </span>
            <input
              type="number"
              min="1"
              max="604"
              value={page}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val)) {
                  setPage(Math.max(1, Math.min(604, val)));
                }
              }}
              className="w-14 px-2 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-1 py-1 text-xs font-semibold rounded hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(604, p + 1))}
              disabled={page >= 604}
              className="px-1 py-1 text-xs font-semibold rounded hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Eye toggle + Reveal-one — visible on lg+ only */}
          <div className="hidden lg:flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
            <button
              onClick={handleToggleHide}
              title={
                isVerseHidden
                  ? "Tampilkan semua ayat"
                  : "Sembunyikan semua ayat"
              }
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                isVerseHidden
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "hover:bg-white dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
              }`}
            >
              {isVerseHidden ? <EyeOff size={14} /> : <Eye size={14} />}
              <span>{isVerseHidden ? "Buka Semua" : "Tutup"}</span>
            </button>
            {isVerseHidden && (
              <button
                onClick={handleRevealNext}
                disabled={allRevealed}
                title="Buka satu ayat berikutnya"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-amber-500 hover:bg-amber-400 text-white shadow-sm"
              >
                <Eye size={14} />
                <span>
                  {allRevealed
                    ? "Semua terbuka"
                    : `+1 Ayat (${revealedVerseKeys.size}/${verses.length})`}
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Fixed Eye FAB group — only visible below lg */}
      <div className="lg:hidden fixed bottom-6 right-6 z-50 flex items-center gap-2">
        {/* Reveal one at a time — only shown when hidden */}
        {isVerseHidden && (
          <button
            onClick={handleRevealNext}
            disabled={allRevealed}
            title="Buka satu ayat berikutnya"
            className="flex items-center gap-2 px-4 py-3 rounded-full text-sm font-semibold shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-amber-500 text-white shadow-amber-500/40"
          >
            <Eye size={18} />
            <span className="hidden sm:inline">
              {allRevealed
                ? "Semua"
                : `${revealedVerseKeys.size}/${verses.length}`}
            </span>
          </button>
        )}
        {/* Eye toggle */}
        <button
          onClick={handleToggleHide}
          title={
            isVerseHidden ? "Tampilkan semua ayat" : "Sembunyikan semua ayat"
          }
          className={`flex items-center gap-2 px-4 py-3 rounded-full text-sm font-semibold shadow-xl transition-all active:scale-95 ${
            isVerseHidden
              ? "bg-emerald-600 text-white shadow-emerald-500/40"
              : "bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 shadow-zinc-300/50 dark:shadow-zinc-900/60"
          }`}
        >
          {isVerseHidden ? <EyeOff size={18} /> : <Eye size={18} />}
          <span className="hidden sm:inline">
            {isVerseHidden ? "Buka Semua" : "Tutup Ayat"}
          </span>
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Mushaf Page */}
        <div className="lg:col-span-8 flex flex-col items-center">
          {loading ? (
            <div className="w-full aspect-[1/1.41] max-w-2xl bg-amber-50/20 dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shadow-lg">
              <div className="flex flex-col items-center gap-3 text-zinc-400 dark:text-zinc-600">
                <div className="w-10 h-10 border-4 border-t-emerald-600 border-zinc-300 dark:border-zinc-700 rounded-full animate-spin"></div>
                <span className="text-sm font-medium">Memuat mushaf...</span>
              </div>
            </div>
          ) : error ? (
            <div className="w-full p-8 text-center bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-2xl text-red-700 dark:text-red-300">
              <p className="font-semibold">{error}</p>
              <button
                onClick={() => setRetryCount((r) => r + 1)}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-500 transition-colors"
              >
                Coba Lagi
              </button>
            </div>
          ) : (
            <div className="w-full max-w-2xl relative">
              {/* Mushaf Frame Box */}
              <div
                className={`w-full aspect-[1/1.65] md:aspect-[1/1.41] bg-[#FBF7F0] dark:bg-[#0E1511] text-[#1F140A] dark:text-[#E8DFD0] rounded-3xl border-2 md:border-4 lg:border-8 border-[#D4AF37] dark:border-[#B59424] shadow-2xl relative overflow-hidden flex flex-col p-2 md:p-10 select-none ${page % 2 === 1 ? "!border-l-0 rounded-tl-none rounded-bl-none" : "!border-r-0 rounded-tr-none rounded-br-none"}`}
                style={{ containerType: "inline-size" }}
              >
                {/* Vintage Paper Overlay */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"></div>

                {/* Islamic Gold Corner Designs */}
                {/* Corner ornaments — hidden on the borderless side */}
                {page % 2 !== 1 && (
                  <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#D4AF37] opacity-60 rounded-tl-lg pointer-events-none"></div>
                )}
                {page % 2 === 1 && (
                  <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#D4AF37] opacity-60 rounded-tr-lg pointer-events-none"></div>
                )}
                {page % 2 !== 1 && (
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#D4AF37] opacity-60 rounded-bl-lg pointer-events-none"></div>
                )}
                {page % 2 === 1 && (
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#D4AF37] opacity-60 rounded-br-lg pointer-events-none"></div>
                )}

                {/* Page Header (Juz & Page Info) */}
                <div className="flex justify-between items-center text-[10px] md:text-sm font-semibold text-[#8B6B22] dark:text-[#C5A866] border-b border-[#D4AF37]/30 pb-1 sm:pb-3 mb-1 sm:mb-4 font-sans">
                  <div>Juz {currentJuz}</div>
                  <div className="text-center font-bold tracking-widest">
                    {currentSurahs.map((sId) => SURAHS[sId]?.name).join(" & ")}
                  </div>
                  <div>
                    <span className="hidden sm:inline">Hlm. </span>
                    {page}
                  </div>
                </div>

                {/* 15 Lines Layout Container */}
                <div className="flex-1 flex flex-col justify-between my-2">
                  {lines.map(({ lineNum, words }) => {
                    const isSpecial = specialLines[lineNum];

                    if (isSpecial) {
                      if (isSpecial.type === "header") {
                        const surah = SURAHS[isSpecial.surahId];
                        return (
                          <div
                            key={lineNum}
                            className="w-full flex items-center justify-center my-0"
                          >
                            <div className="w-full py-1.5 md:py-2.5 px-4 bg-gradient-to-r from-transparent via-[#F1E4C3] to-transparent dark:via-[#1B2920] border-y border-[#D4AF37]/40 flex items-center justify-between text-[10px] md:text-sm text-[#5C4513] dark:text-[#D1BE96] font-bold">
                              <span>{surah?.type}</span>
                              <span className="font-amiri text-[14px] md:text-xl font-bold tracking-normal">
                                سُورَةُ {surah?.arabic}
                              </span>
                              <span>{surah?.name}</span>
                            </div>
                          </div>
                        );
                      }

                      if (isSpecial.type === "bismillah") {
                        return (
                          <div
                            key={lineNum}
                            className="w-full flex items-center justify-center font-amiri text-sm sm:text-xl  text-center py-1 text-[#2C1F0F] dark:text-[#F3ECDF] my-1 font-bold"
                            dir="rtl"
                          >
                            بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                          </div>
                        );
                      }
                    }

                    // Standard line container
                    const isLastLineOfSurah =
                      specialLines[lineNum + 1]?.type === "header";
                    const alignClass =
                      page <= 2 || isLastLineOfSurah || words.length < 5
                        ? "justify-center gap-x-2 md:gap-x-4"
                        : "justify-between";

                    // Calculate total characters in standard line to dynamically scale font size and prevent overflow
                    const lineTextLength =
                      words.reduce(
                        (acc, w) => acc + (w.text_uthmani?.length || 0),
                        0,
                      ) + words.length;
                    const dynamicFontSize = `clamp(1rem, ${215 / lineTextLength}cqw, 2.25rem)`;

                    return (
                      <div
                        key={lineNum}
                        className="w-full flex justify-center items-center py-0.5 md:py-1 min-h-[2.2rem] md:min-h-[2.8rem]"
                        dir="rtl"
                      >
                        {words.length > 0 ? (
                          <div
                            className={`flex flex-row flex-nowrap items-center w-full ${alignClass}`}
                          >
                            {words.map((word) => {
                              const isActive = activeWordId === word.id;
                              const isVerseActive =
                                activeVerseKey === word.verse_key;
                              const isEnd = word.char_type_name === "end";
                              // Hidden if verse-hide is on AND this verse hasn't been revealed yet
                              const wordIsHidden =
                                isVerseHidden &&
                                !revealedVerseKeys.has(word.verse_key);

                              if (isEnd) {
                                return (
                                  <span
                                    key={word.id}
                                    className={`inline-flex flex-shrink-0 items-center justify-center rounded-full border border-[#D4AF37] bg-[#F4EFE6] dark:bg-[#1A251E] text-[#8B6B22] dark:text-[#C5A866] shadow-sm select-none mx-0.5 ${
                                      lineTextLength > 85
                                        ? "w-4.5 h-4.5 md:w-6 md:h-6 text-[8px] md:text-[10px]"
                                        : "w-6 h-6 md:w-7 md:h-7 text-xs font-bold"
                                    } ${
                                      isVerseActive
                                        ? "ring-2 ring-emerald-500 ring-offset-1 dark:ring-offset-black"
                                        : ""
                                    } ${wordIsHidden ? "blur-sm pointer-events-none" : ""}`}
                                  >
                                    {word.text_uthmani}
                                  </span>
                                );
                              }

                              return (
                                <button
                                  key={word.id}
                                  onClick={() =>
                                    !wordIsHidden && handleWordClick(word)
                                  }
                                  style={{ fontSize: dynamicFontSize }}
                                  className={`font-amiri whitespace-nowrap tracking-normal leading-normal transition-all duration-200 outline-none rounded px-0.5 md:px-1 py-px flex-shrink ${
                                    wordIsHidden
                                      ? "blur-[6px] select-none cursor-default pointer-events-none"
                                      : isActive
                                        ? "bg-[#D4AF37]/30 dark:bg-emerald-700/40 text-emerald-800 dark:text-emerald-300 scale-105 cursor-pointer"
                                        : isVerseActive
                                          ? "bg-[#D4AF37]/10 dark:bg-emerald-950/30 text-zinc-900 dark:text-zinc-50 cursor-pointer"
                                          : "text-[#1F140A] dark:text-[#E8DFD0] hover:bg-[#D4AF37]/15 dark:hover:bg-emerald-950/20 cursor-pointer"
                                  }`}
                                  title={
                                    wordIsHidden
                                      ? undefined
                                      : word.transliteration?.text
                                  }
                                >
                                  {word.text_uthmani}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          // Fallback/empty spacer for lines that have no content (e.g. bottom lines of page 1 & 2)
                          <div className="w-1/3 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent"></div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Page Footer */}
                <div className="hidden lg:flex justify-center items-center text-xs text-[#8B6B22] dark:text-[#C5A866] border-t border-[#D4AF37]/30 pt-3 mt-4">
                  <span>Sabbit Quran Utsmani</span>
                </div>
              </div>

              {/* Instructions helper overlay */}
              <p className="text-center text-xs text-zinc-500 dark:text-zinc-400 mt-3">
                * Klik pada kata untuk mendengarkan audio per kata dan melihat
                artinya.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Translations & Detailed View */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Active Word translation / Detail card */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg p-5">
            <h3 className="text-xs font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase mb-3">
              Detail Kata Aktif
            </h3>
            {selectedWord ? (
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    Verse {selectedWord.verse_key}
                  </span>
                  {selectedWord.audio_url && (
                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-full">
                      Audio Tersedia
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center gap-4 py-2 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="text-left">
                    <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                      {selectedWord.transliteration?.text || "-"}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
                      Transliterasi
                    </p>
                  </div>
                  <div className="text-right font-amiri text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedWord.text_uthmani}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 mb-1">
                    Terjemahan Kata:
                  </h4>
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                    {selectedWord.translation?.text || "-"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-zinc-400 dark:text-zinc-500 italic">
                Klik kata di mushaf untuk memuat transliterasi dan terjemahan
                per kata.
              </div>
            )}
          </div>

          {/* Verses Translation Sidebar */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg p-5 flex flex-col max-h-[500px]">
            <h3 className="text-xs font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase mb-3 pb-2 border-b border-zinc-100 dark:border-zinc-800">
              Terjemahan Ayat (Halaman {page})
            </h3>

            {loading ? (
              <div className="flex-1 flex items-center justify-center py-10">
                <span className="text-sm text-zinc-400 animate-pulse">
                  Memuat terjemahan...
                </span>
              </div>
            ) : (
              <div className="flex-grow overflow-y-auto pr-1 space-y-4 custom-scrollbar">
                {verses.map((verse) => {
                  const isVerseActive = activeVerseKey === verse.verse_key;
                  return (
                    <div
                      key={verse.id}
                      onClick={() => setActiveVerseKey(verse.verse_key)}
                      className={`p-3 rounded-xl cursor-pointer border transition-all ${
                        isVerseActive
                          ? "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-900"
                          : "border-zinc-100 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-850"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          Ayat {verse.verse_key}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                        {verse.translations?.[0]?.text
                          ? verse.translations[0].text.replace(
                              /<sup[^>]*>.*?<\/sup>/g,
                              "",
                            )
                          : "Tidak ada terjemahan."}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="text-center text-xs text-zinc-400 dark:text-zinc-500 mt-6 mb-4 flex flex-col lg:flex-row gap-1 justify-center">
        <p className="">
          © 2026 <a href="https://sabbit.id">Sabbit</a> - Aplikasi Murojaah
          Al-Quran -
        </p>
        <a
          href="https://trakteer.id/madaapril/tip"
          target="_blank"
          className="underline"
        >
          Support Kami
        </a>
      </footer>
    </div>
  );
}
