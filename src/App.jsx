import React, { useState, useEffect } from 'react';
import pptxgen from 'pptxgenjs';
import { Plus, Download, Trash2, Edit2, Loader2, Play } from 'lucide-react';
import { db, initAuth } from './firebase'; // Pastikan path ini sesuai
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';

export default function App() {
  const [slides, setSlides] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

  // ==========================================
  // 1. FIREBASE: REAL-TIME LISTENER
  // ==========================================
  useEffect(() => {
    const setupFirebase = async () => {
      await initAuth();
      const slidesCollection = collection(db, 'slides_ibadah');

      const unsubscribe = onSnapshot(slidesCollection, (snapshot) => {
        const dataCloud = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Urutkan berdasarkan waktu pembuatan
        dataCloud.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
        
        setSlides(dataCloud);
        setIsLoading(false);
      });

      return () => unsubscribe();
    };

    setupFirebase();
  }, []);

  // ==========================================
  // 2. FIREBASE: CREATE & UPDATE
  // ==========================================
  const handleSaveSlide = async (e) => {
    e.preventDefault();
    if (!content.trim()) return alert("Isi teks tidak boleh kosong!");

    try {
      const slidesCollection = collection(db, 'slides_ibadah');
      const slideData = {
        title: title.trim(),
        content: content.trim(),
        type: 'text',
        align: 'center'
      };

      if (editingId) {
        // Mode Update
        const slideRef = doc(db, 'slides_ibadah', editingId);
        await updateDoc(slideRef, slideData);
        setEditingId(null);
      } else {
        // Mode Create
        await addDoc(slidesCollection, {
          ...slideData,
          createdAt: serverTimestamp()
        });
      }

      setTitle('');
      setContent('');
    } catch (error) {
      console.error("Gagal menyimpan data:", error);
      alert("Gagal menyimpan data ke cloud!");
    }
  };

  // ==========================================
  // 3. FIREBASE: DELETE
  // ==========================================
  const handleDeleteSlide = async (id) => {
    if (!window.confirm("Yakin ingin menghapus slide ini?")) return;
    try {
      await deleteDoc(doc(db, 'slides_ibadah', id));
    } catch (error) {
      console.error("Gagal menghapus:", error);
      alert("Gagal menghapus slide!");
    }
  };

  const handleEditClick = (slide) => {
    setEditingId(slide.id);
    setTitle(slide.title || '');
    setContent(slide.content || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
  };

  // ==========================================
  // 4. PPTXGENJS: EXPORT (VERSI STABIL)
  // ==========================================
  const exportToPPTX = async () => {
    if (slides.length === 0) return alert("Tidak ada slide untuk diekspor!");
    setIsExporting(true);

    try {
      const pres = new pptxgen();
      pres.layout = 'LAYOUT_4x3'; 

      slides.forEach((slide) => {
        const pptSlide = pres.addSlide();

        // 1. JUDUL SLIDE 
        if (slide.title) {
          pptSlide.addText(slide.title, {
            x: 0.5,
            y: 0.3,
            w: 9.0,
            h: 0.9,
            fontSize: 36, 
            color: '333333',
            align: 'left',
            fontFace: 'Arial',
            bold: true,
            valign: 'middle'
          });
        }

        // 2. ISI SLIDE UTAMA 
        const slideText = slide.content ? String(slide.content) : " ";
        pptSlide.addText(slideText, {
          x: 0.5,
          y: slide.title ? 1.4 : 0.5,
          w: 9.0,
          h: slide.title ? 5.2 : 6.5,
          fontSize: 31,
          align: slide.align || 'center',
          valign: 'middle',
          fontFace: 'Arial',
          color: '000000', 
          bold: true,
          fit: 'shrink' // Kembali ke versi fit awal yang lebih aman
        });
      });

      await pres.writeFile({ fileName: "Tata_Ibadah_Online.pptx" });
    } catch (err) {
      console.error("Error Export:", err);
      alert("Gagal membuat PPTX: " + err.message);
    } finally {
      setIsExporting(false); 
    }
  };

  // ==========================================
  // RENDER UI
  // ==========================================
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Tata Ibadah PPTX</h1>
            <p className="text-sm text-gray-500">Cloud Sync via Firebase Firestore</p>
          </div>
          <button 
            onClick={exportToPPTX}
            disabled={isExporting || slides.length === 0}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            {isExporting ? "Memproses..." : "Export PPTX"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* FORM INPUT */}
          <div className="md:col-span-1 bg-white p-5 rounded-xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-lg font-semibold mb-4 text-gray-700">
              {editingId ? 'Edit Slide' : 'Tambah Slide'}
            </h2>
            <form onSubmit={handleSaveSlide} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Judul (Opsional)</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Misal: BERITA ANUGERAH..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Isi Teks *</label>
                <textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows="6"
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="Masukkan teks lirik/liturgi di sini..."
                  required
                />
              </div>
              <div className="flex gap-2">
                <button 
                  type="submit" 
                  className="flex-1 flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium transition-colors"
                >
                  {editingId ? 'Update' : <Plus className="w-5 h-5" />}
                  {editingId ? 'Update Data' : 'Tambah'}
                </button>
                {editingId && (
                  <button 
                    type="button"
                    onClick={cancelEdit}
                    className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                  >
                    Batal
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* LIST SLIDES (REALTIME) */}
          <div className="md:col-span-2 space-y-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-48 bg-white rounded-xl border border-gray-100 shadow-sm">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                <p className="text-gray-500">Memuat data dari cloud...</p>
              </div>
            ) : slides.length === 0 ? (
              <div className="flex items-center justify-center h-48 bg-white rounded-xl border border-gray-100 border-dashed shadow-sm">
                <p className="text-gray-400">Belum ada slide. Silakan tambah data.</p>
              </div>
            ) : (
              slides.map((slide, index) => (
                <div key={slide.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4 items-start group">
                  <div className="bg-blue-50 text-blue-600 font-bold w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {slide.title && <h3 className="font-bold text-gray-800 mb-1">{slide.title}</h3>}
                    <p className="text-gray-600 whitespace-pre-wrap text-sm line-clamp-3">
                      {slide.content}
                    </p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEditClick(slide)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteSlide(slide.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
}