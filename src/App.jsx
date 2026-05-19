import React, { useState, useRef, useEffect } from 'react';
import mammoth from 'mammoth';
import pptxgen from 'pptxgenjs';
import { 
  Trash2, Download, Plus, ChevronLeft, ChevronRight, 
  Image as ImageIcon, FileText, Video, Music, Edit3, Loader2,
  AlignLeft, AlignCenter, AlignRight, GripHorizontal
} from 'lucide-react';

export default function App() {
  // STATE UTAMA
  const [slides, setSlides] = useState([]);
  const [bgImage, setBgImage] = useState(null);
  const [fontSize, setFontSize] = useState(40);
  const [textAlign, setTextAlign] = useState('center'); // Global Align
  const [textColor, setTextColor] = useState('000000'); // Global Text Color (Hex format)
  
  const [isExporting, setIsExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const slidesPerPage = 4;
  
  // State untuk melacak indeks slide yang sedang ditarik (Drag & Drop)
  const [draggedIndex, setDraggedIndex] = useState(null);

  const docxInputRef = useRef(null);
  const bgInputRef = useRef(null);

  // FITUR 2: LOAD DRAFT DARI LOCALSTORAGE SAAT APLIKASI DIKLIK/DIbuka
  useEffect(() => {
    const savedSlides = localStorage.getItem('liturgi_converter_slides');
    const savedBg = localStorage.getItem('liturgi_converter_bg');
    const savedFontSize = localStorage.getItem('liturgi_converter_fontsize');
    const savedTextAlign = localStorage.getItem('liturgi_converter_align');
    const savedTextColor = localStorage.getItem('liturgi_converter_color');

    if (savedSlides) setSlides(JSON.parse(savedSlides));
    if (savedBg) setBgImage(savedBg);
    if (savedFontSize) setFontSize(savedFontSize);
    if (savedTextAlign) setTextAlign(savedTextAlign);
    if (savedTextColor) setTextColor(savedTextColor);
  }, []);

  // FITUR 2: AUTO-SAVE KE LOCALSTORAGE TIAP ADA PERUBAHAN (ANTI-STRES)
  useEffect(() => {
    if (slides.length > 0) {
      localStorage.setItem('liturgi_converter_slides', JSON.stringify(slides));
    }
  }, [slides]);

  useEffect(() => {
    localStorage.setItem('liturgi_converter_fontsize', fontSize);
    localStorage.setItem('liturgi_converter_align', textAlign);
    localStorage.setItem('liturgi_converter_color', textColor);
    if (bgImage) {
      try {
        localStorage.setItem('liturgi_converter_bg', bgImage);
      } catch (e) {
        console.warn("Ukuran gambar terlalu besar untuk disimpan di localStorage");
      }
    }
  }, [fontSize, textAlign, textColor, bgImage]);

  // Reset halaman otomatis jika posisi slide berubah banyak
  useEffect(() => {
    const totalPages = Math.ceil(slides.length / slidesPerPage);
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [slides.length, currentPage]);

  // PROSES TAMBAH SLIDE & FORMAT DEFAULT
  const addSlide = (content, title, slideArray) => {
    let type = 'text';
    if (content.includes('♫') || content.includes('📺')) type = 'video';
    else if (content.includes('🔊') || content.includes('🎵')) type = 'audio';

    slideArray.push({
      id: crypto.randomUUID(),
      title: title,
      content: content,
      type: type,
      mediaFilename: '',
      align: 'inherit' // FITUR 4: 'inherit' mengikuti global, atau bisa di-override per slide
    });
  };

  // PARSING FILE WORD
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target.result;
        const result = await mammoth.convertToHtml({ arrayBuffer });
        const html = result.value;

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        let currentTitle = "";
        let parsedSlides = [];

        doc.body.childNodes.forEach((node) => {
          const tagName = node.tagName?.toLowerCase();
          
          let innerHtml = node.innerHTML?.replace(/<br\s*\/?>/gi, '\n') || '';
          let tempDiv = document.createElement('div');
          tempDiv.innerHTML = innerHtml;
          let text = tempDiv.textContent; 

          if (tagName === 'h1') {
            currentTitle = text.replace(/[{}]/g, '').trim();
          } 
          else if (['h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
            if (!text || text.trim() === '') return;

            let cleanText = text.replace(/\(.*?\)/gs, '');
            const blocks = cleanText.split(/\n\s*\n+/);

            blocks.forEach((block) => {
              const finalBlockText = block.trim();
              if (finalBlockText) {
                addSlide(finalBlockText, currentTitle, parsedSlides);
              }
            });
          }
        });

        setSlides(parsedSlides);
        setCurrentPage(1); 
      } catch (error) {
        console.error(error);
        alert("Gagal membaca file Word.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // FITUR 3: LOGIKA DRAG AND DROP NATIVE (OFFLINE-FRIENDLY)
  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Diperlukan agar item bisa di-drop
  };

  const handleDrop = (targetIndex) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const updatedSlides = [...slides];
    const [draggedItem] = updatedSlides.splice(draggedIndex, 1);
    updatedSlides.splice(targetIndex, 0, draggedItem);

    setSlides(updatedSlides);
    setDraggedIndex(null);
  };

  // MANAJEMEN EDIT SLIDE
  const handleAddSlideAfter = (globalIndex) => {
    const newSlide = {
      id: crypto.randomUUID(),
      title: slides[globalIndex]?.title || '', 
      content: '',
      type: 'text',
      mediaFilename: '',
      align: 'inherit'
    };
    const newSlides = [...slides];
    newSlides.splice(globalIndex + 1, 0, newSlide);
    setSlides(newSlides);
  };

  const handleDeleteSlide = (globalIndex) => {
    const newSlides = [...slides];
    newSlides.splice(globalIndex, 1);
    setSlides(newSlides);
  };

  const updateSlideData = (id, field, value) => {
    setSlides(slides.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const clearAll = () => {
    if(window.confirm("Apakah Anda yakin ingin menghapus semua data draft kerja?")) {
      setSlides([]);
      setBgImage(null);
      localStorage.clear();
      if (docxInputRef.current) docxInputRef.current.value = "";
      if (bgInputRef.current) bgInputRef.current.value = "";
    }
  };

  // EXPORT KE POWERPOINT
  const exportToPPTX = async () => {
    if (slides.length === 0) return alert("Tidak ada slide untuk diekspor!");
    setIsExporting(true);

    try {
      const pres = new pptxgen();

      slides.forEach((slide) => {
        const pptSlide = pres.addSlide();

        if (bgImage) {
          pptSlide.addImage({ data: bgImage, x: 0, y: 0, w: "100%", h: "100%" });
        }

        if (slide.title) {
          pptSlide.addText(slide.title, {
            x: 0.5, y: 0.3, w: '90%', h: 0.5,
            fontSize: 16, color: textColor === 'FFFFFF' ? 'CCCCCC' : '565656', align: 'left', fontFace: 'Arial', bold: true
          });
        }

        // Tentukan perataan teks (Fitur 4: Prioritaskan khusus per-slide jika ada)
        const finalAlign = slide.align === 'inherit' ? textAlign : slide.align;

        const slideText = slide.content ? String(slide.content) : " ";
        pptSlide.addText(slideText, {
          x: 0.5, y: 1.0, w: '90%', h: '70%',
          fontSize: parseInt(fontSize),
          align: finalAlign,
          valign: 'middle',
          fontFace: 'Arial',
          color: textColor, // FITUR 1: Warna teks dinamis (Light/Dark theme)
          bold: true,
          shrinkText: true // FITUR UTAMA TAMBAHAN: Otomatis kecilkan huruf jika overload kotak!
        });

        if (slide.type !== 'text') {
          const label = slide.type === 'video' ? '📺 VIDEO' : '🔊 AUDIO';
          const filename = slide.mediaFilename || 'Belum ada file disisipkan';
          
          let textOptions = {
            x: 0.5, y: '85%', w: '90%', h: 0.5,
            fontSize: 14, color: 'FF0000', align: 'center', italic: true
          };

          if (slide.mediaFilename) {
            textOptions.hyperlink = { url: `./${slide.mediaFilename}` };
          }
          pptSlide.addText(`[MEDIA: ${label} - ${filename}]`, textOptions);
        }
      });

      await pres.writeFile({ fileName: "Tata_Ibadah_Presentation.pptx" });
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan sistem saat membuat file PowerPoint: " + err.message);
    } finally {
      setIsExporting(false); 
    }
  };

  const totalPages = Math.ceil(slides.length / slidesPerPage);
  const indexOfLastSlide = currentPage * slidesPerPage;
  const indexOfFirstSlide = indexOfLastSlide - slidesPerPage;
  const currentSlides = slides.slice(indexOfFirstSlide, indexOfLastSlide);

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 font-sans p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* PANEL KONTROL UTAMA */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-6 justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Liturgi ke PPTX Converter Pro</h1>
            <div className="flex gap-3 mt-3">
              <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 font-semibold rounded text-sm cursor-pointer hover:bg-blue-100 transition">
                <FileText size={16} /> Upload Word
                <input type="file" accept=".docx" ref={docxInputRef} onChange={handleFileUpload} className="hidden" />
              </label>
              <label className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 font-semibold rounded text-sm cursor-pointer hover:bg-purple-100 transition">
                <ImageIcon size={16} /> Set Background
                <input type="file" accept="image/*" ref={bgInputRef} onChange={(e) => {
                  const file = e.target.files[0];
                  if(file) {
                    const r = new FileReader(); r.onload=(ev)=>setBgImage(ev.target.result); r.readAsDataURL(file);
                  }
                }} className="hidden" />
              </label>
              <button onClick={clearAll} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 font-semibold rounded text-sm hover:bg-red-100 transition">
                <Trash2 size={16} /> Clear Draft
              </button>
            </div>
          </div>
          
          {/* BAR SETTING GLOBAL */}
          <div className="flex flex-wrap items-center gap-3 bg-gray-50 p-3 rounded-lg border">
            <select value={fontSize} onChange={(e) => setFontSize(e.target.value)} className="p-1.5 border rounded bg-white text-xs font-medium">
              <option value="32">Font 32 pt</option>
              <option value="40">Font 40 pt</option>
              <option value="48">Font 48 pt</option>
            </select>
            
            <select value={textAlign} onChange={(e) => setTextAlign(e.target.value)} className="p-1.5 border rounded bg-white text-xs font-medium">
              <option value="left">Global Rata Kiri</option>
              <option value="center">Global Rata Tengah</option>
            </select>

            {/* FITUR 1: Dropdown Warna Teks Global (Light/Dark Mode Theme) */}
            <select value={textColor} onChange={(e) => setTextColor(e.target.value)} className="p-1.5 border rounded bg-white text-xs font-medium">
              <option value="000000">Teks: Hitam (Light Mode)</option>
              <option value="FFFFFF">Teks: Putih (Dark Mode)</option>
              <option value="003366">Teks: Biru Tua</option>
              <option value="990000">Teks: Merah Tua</option>
            </select>

            <button 
              onClick={exportToPPTX} 
              disabled={isExporting}
              className={`flex items-center gap-2 px-5 py-1.5 text-white text-sm font-bold rounded shadow transition ${
                isExporting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {isExporting ? "Proses..." : "Export PPTX"}
            </button>
          </div>
        </div>

        {/* KOTAK PREVIEW */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold mb-4 flex items-center justify-between">
            <span>Preview Tampilan <span className="text-blue-600 text-sm ml-2">({slides.length} Slide) — Geser/Drag Kotak untuk Atur Urutan</span></span>
          </h2>
          
          {slides.length === 0 ? (
            <div className="text-center py-16 text-gray-400 border-2 border-dashed rounded-xl bg-gray-50">
              Silakan unggah dokumen liturgi untuk memulai kerja.
            </div>
          ) : (
            <>
              {/* GRID VIEW UTAMA DENGAN DRAG & DROP HANDLER NATIVE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {currentSlides.map((slide, index) => {
                  const globalIndex = indexOfFirstSlide + index;
                  
                  return (
                    <div 
                      key={slide.id} 
                      draggable
                      onDragStart={() => handleDragStart(globalIndex)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(globalIndex)}
                      className={`relative flex flex-col p-5 rounded-xl border-2 shadow-sm transition min-h-[240px] bg-white group cursor-default ${
                        draggedIndex === globalIndex ? 'opacity-30 border-dashed border-blue-500' : 'border-gray-200 hover:border-blue-400'
                      }`}
                    >
                      
                      {/* Baris Atas Slide Header */}
                      <div className="flex justify-between items-center mb-3 border-b pb-2 border-gray-100">
                        <div className="flex items-center gap-2 w-2/3">
                          {/* Indikator Handle Grip Pegangan Drag */}
                          <div className="text-gray-400 cursor-move p-1 hover:text-blue-500 transition" title="Tarik di sini untuk atur urutan">
                            <GripHorizontal size={16} />
                          </div>
                          <input 
                            type="text"
                            value={slide.title}
                            onChange={(e) => updateSlideData(slide.id, 'title', e.target.value)}
                            placeholder="Tanpa Judul"
                            className="text-xs font-bold text-gray-500 uppercase tracking-wide bg-transparent focus:outline-none focus:border-b border-blue-400 w-full"
                          />
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {/* FITUR 4: INDIVIDUAL ALIGNMENT PICKER PER SLIDE */}
                          <div className="flex bg-gray-100 rounded p-0.5 gap-0.5">
                            <button 
                              onClick={() => updateSlideData(slide.id, 'align', 'left')} 
                              className={`p-1 rounded transition ${slide.align === 'left' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                              title="Rata Kiri"
                            >
                              <AlignLeft size={12} />
                            </button>
                            <button 
                              onClick={() => updateSlideData(slide.id, 'align', 'center')} 
                              className={`p-1 rounded transition ${slide.align === 'center' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                              title="Rata Tengah"
                            >
                              <AlignCenter size={12} />
                            </button>
                            <button 
                              onClick={() => updateSlideData(slide.id, 'align', 'inherit')} 
                              className={`text-[9px] px-1 font-bold rounded transition ${slide.align === 'inherit' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                              title="Ikut Aturan Global"
                            >
                              Def
                            </button>
                          </div>

                          <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">
                            #{globalIndex + 1}
                          </span>
                        </div>
                      </div>

                      {/* Area Pengetikan Isi */}
                      <textarea 
                        value={slide.content}
                        onChange={(e) => updateSlideData(slide.id, 'content', e.target.value)}
                        className={`w-full flex-grow resize-none text-base font-semibold text-gray-800 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-200 rounded p-2 border border-transparent ${
                          slide.type === 'video' ? 'bg-yellow-50/60 border-yellow-100' : 
                          slide.type === 'audio' ? 'bg-green-50/60 border-green-100' : ''
                        }`}
                        placeholder="Ketik isi liturgi disini..."
                      />

                      {/* Bagian Media File Input */}
                      {slide.type !== 'text' && (
                        <div className="mt-3 flex items-center gap-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
                          {slide.type === 'video' ? <Video size={16} className="text-yellow-600"/> : <Music size={16} className="text-green-600"/>}
                          <input type="file" id={`media-${slide.id}`} className="hidden" onChange={(e) => handleMediaUpload(slide.id, e.target.files[0])} />
                          <label htmlFor={`media-${slide.id}`} className="cursor-pointer text-[11px] font-bold px-2.5 py-1 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-100 flex items-center gap-1 transition">
                            {slide.mediaFilename ? <Edit3 size={10}/> : <Plus size={10}/>}
                            {slide.mediaFilename ? 'Ubah File' : 'Set File'}
                          </label>
                          <span className="text-xs text-gray-500 truncate max-w-[150px]" title={slide.mediaFilename}>
                            {slide.mediaFilename || 'Belum dimasukkan'}
                          </span>
                        </div>
                      )}

                      {/* Tombol Hapus & Tambah Cepat */}
                      <div className="absolute -right-2 -bottom-2 flex gap-1 opacity-0 group-hover:opacity-100 transition duration-200 z-10">
                        <button onClick={() => handleDeleteSlide(globalIndex)} className="p-2 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition" title="Hapus Slide">
                          <Trash2 size={12} />
                        </button>
                        <button onClick={() => handleAddSlideAfter(globalIndex)} className="p-2 bg-emerald-500 text-white rounded-full shadow-md hover:bg-emerald-600 transition" title="Sisipkan Slide Baru Setelah Ini">
                          <Plus size={12} />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>

              {/* NAVIGASI HALAMAN (PAGINATION) */}
              <div className="mt-8 flex justify-center items-center gap-4 border-t pt-4 border-gray-100">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                  disabled={currentPage === 1}
                  className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 transition"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="text-sm font-bold text-gray-600 bg-gray-50 px-4 py-1.5 rounded-full border">
                  Halaman {currentPage} dari {totalPages}
                </span>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 transition"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}