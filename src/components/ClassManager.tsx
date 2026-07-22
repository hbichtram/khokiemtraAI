import React, { useState, useEffect, useRef } from "react";
import { Class, Student } from "../types";
import { 
  Users, Plus, Trash2, Edit2, Copy, Search, Check, 
  ChevronRight, AlertCircle, RefreshCw, X, ArrowLeft,
  FileSpreadsheet, Download, Upload, Info, AlertTriangle, 
  CheckCircle2, ShieldCheck, FileText
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  fsGetClasses,
  fsCreateClass,
  fsDeleteClass,
  fsAddStudent,
  fsAddStudentsBulk,
  fsUpdateStudent,
  fsDeleteStudent
} from "../lib/firestoreData";

export default function ClassManager() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New Class Form
  const [newClassName, setNewClassName] = useState("");
  const [showAddClass, setShowAddClass] = useState(false);

  // Student Form
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentCode, setNewStudentCode] = useState("");
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Copy indicator state
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Excel Import States
  const [showImportExcel, setShowImportExcel] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<"skip" | "cancel">("skip");
  const [importResult, setImportResult] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "STT": 1,
        "Họ và tên": "Nguyễn Văn An",
        "Mã học sinh": "HS001"
      },
      {
        "STT": 2,
        "Họ và tên": "Trần Thị Bình",
        "Mã học sinh": "HS002"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Danh sach hoc sinh");
    
    // Set column widths for beautiful look
    worksheet["!cols"] = [
      { wch: 6 },  // STT
      { wch: 25 }, // Họ và tên
      { wch: 15 }  // Mã học sinh
    ];

    XLSX.writeFile(workbook, "Mau_Danh_Sach_Hoc_Sinh.xlsx");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleExcelFile(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleExcelFile(file);
    }
  };

  const handleExcelFile = (file: File) => {
    // Validate file extension
    const name = file.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls") && !name.endsWith(".csv")) {
      setValidationError("Chỉ chấp nhận các file Excel hợp lệ (.xlsx, .xls, .csv)");
      return;
    }

    setImportFile(file);
    setParsing(true);
    setValidationError(null);
    setParsedData(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const bstr = e.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        if (rows.length === 0) {
          throw new Error("File Excel rỗng.");
        }

        // Identify headers
        let headerRowIdx = -1;
        let nameColIdx = -1;
        let codeColIdx = -1;

        // Search in first 10 rows for headers
        for (let r = 0; r < Math.min(rows.length, 10); r++) {
          const row = rows[r];
          if (!row || !Array.isArray(row)) continue;

          const nameIdx = row.findIndex((cell) => {
            const str = String(cell || "").trim().toLowerCase();
            return str === "họ và tên" || str === "ho va ten" || str === "họ tên" || str === "ho ten";
          });

          const codeIdx = row.findIndex((cell) => {
            const str = String(cell || "").trim().toLowerCase();
            return str === "mã học sinh" || str === "ma hoc sinh" || str === "mã hs" || str === "ma hs";
          });

          if (nameIdx !== -1 && codeIdx !== -1) {
            headerRowIdx = r;
            nameColIdx = nameIdx;
            codeColIdx = codeIdx;
            break;
          }
        }

        // Fallback: If no explicit headers found, use first row as headers if it contains names
        if (headerRowIdx === -1) {
          const row0 = rows[0];
          if (row0 && row0.length >= 2) {
            headerRowIdx = 0;
            nameColIdx = row0.findIndex((cell) => String(cell || "").toLowerCase().includes("tên") || String(cell || "").toLowerCase().includes("ten"));
            codeColIdx = row0.findIndex((cell) => String(cell || "").toLowerCase().includes("mã") || String(cell || "").toLowerCase().includes("ma") || String(cell || "").toLowerCase().includes("code"));
            
            if (nameColIdx === -1) nameColIdx = 1; // Fallback to column 2
            if (codeColIdx === -1) codeColIdx = 2; // Fallback to column 3
          }
        }

        if (nameColIdx === -1 || codeColIdx === -1) {
          let missingColumns = [];
          if (nameColIdx === -1) missingColumns.push("Họ và tên");
          if (codeColIdx === -1) missingColumns.push("Mã học sinh");
          
          throw new Error(`Thiếu cột bắt buộc trong file Excel: ${missingColumns.join(", ")}. Vui lòng tải file mẫu để kiểm tra định dạng.`);
        }

        const validStudents: any[] = [];
        const duplicates: any[] = [];
        const errors: any[] = [];
        const processedCodesInFile = new Set<string>();

        // Get all student codes currently in this class & in other classes
        const classCodes = new Set<string>();
        if (selectedClass?.students) {
          selectedClass.students.forEach((std) => classCodes.add(std.studentCode.toUpperCase()));
        }
        
        // System-wide codes
        const systemCodes = new Set<string>();
        classes.forEach((c) => {
          c.students?.forEach((std) => systemCodes.add(std.studentCode.toUpperCase()));
        });

        let totalDataRowsCount = 0;

        for (let r = headerRowIdx + 1; r < rows.length; r++) {
          const row = rows[r];
          // Skip completely empty rows
          if (!row || row.every((cell) => cell === null || cell === undefined || String(cell).trim() === "")) {
            continue;
          }

          totalDataRowsCount++;
          const rowNum = r + 1;
          const rawName = row[nameColIdx];
          const rawCode = row[codeColIdx];

          const name = String(rawName || "").trim();
          const studentCode = String(rawCode || "").trim().toUpperCase();

          // Validation checks
          if (!name) {
            errors.push({
              rowNum,
              message: "Thiếu họ và tên."
            });
            continue;
          }

          if (!studentCode) {
            errors.push({
              rowNum,
              message: "Thiếu mã học sinh."
            });
            continue;
          }

          // Duplicate within file check
          if (processedCodesInFile.has(studentCode)) {
            errors.push({
              rowNum,
              message: `Mã học sinh '${studentCode}' bị trùng lặp trong file Excel.`
            });
            continue;
          }

          processedCodesInFile.add(studentCode);

          // Duplicate with existing students in the class check
          if (classCodes.has(studentCode)) {
            duplicates.push({
              rowNum,
              name,
              studentCode,
              reason: `Mã học sinh '${studentCode}' đã tồn tại trong lớp ${selectedClass?.name}.`
            });
            continue;
          }

          // Duplicate with other classes in the system check
          if (systemCodes.has(studentCode)) {
            duplicates.push({
              rowNum,
              name,
              studentCode,
              reason: `Mã học sinh '${studentCode}' đã tồn tại ở lớp khác trong hệ thống.`
            });
            continue;
          }

          // If all checks pass
          validStudents.push({
            name,
            studentCode
          });
        }

        setParsedData({
          totalRows: totalDataRowsCount,
          validStudents,
          duplicates,
          errors
        });

      } catch (err: any) {
        setValidationError(err.message || "Không thể đọc dữ liệu file Excel. Vui lòng kiểm tra lại định dạng file.");
      } finally {
        setParsing(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = async () => {
    if (!selectedClass || !parsedData) return;

    if (duplicateStrategy === "cancel" && parsedData.duplicates.length > 0) {
      alert("Hủy thao tác nhập do phát hiện học sinh trùng mã trong lớp hoặc hệ thống.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let resultCount = 0;
      let handled = false;
      try {
        const res = await fetch(`/api/classes/${selectedClass.id}/students/bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ students: parsedData.validStudents })
        });
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          const result = await res.json();
          resultCount = result.addedCount;
          handled = true;
        }
      } catch (err) {
        console.warn("API bulk student add failed, using Firestore:", err);
      }

      if (!handled) {
        const res = await fsAddStudentsBulk(selectedClass.id, parsedData.validStudents);
        resultCount = res.addedCount;
      }

      setImportResult({
        added: resultCount,
        skipped: parsedData.duplicates.length,
        errors: parsedData.errors.length
      });

      await fetchClasses();
    } catch (err: any) {
      setValidationError(err.message || "Có lỗi xảy ra khi lưu dữ liệu học sinh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setLoading(true);
    setError(null);
    try {
      let data: Class[] = [];
      let loaded = false;
      try {
        const res = await fetch("/api/classes");
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          data = await res.json();
          loaded = true;
        }
      } catch (err) {
        console.warn("API classes fetch failed, using Firestore:", err);
      }

      if (!loaded) {
        data = await fsGetClasses();
      }

      setClasses(data);
      if (selectedClass) {
        const updated = data.find((c: Class) => c.id === selectedClass.id);
        if (updated) setSelectedClass(updated);
      }
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    setLoading(true);
    setError(null);
    try {
      let newCls: Class | null = null;
      try {
        const res = await fetch("/api/classes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newClassName }),
        });
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          newCls = await res.json();
        }
      } catch (err) {
        console.warn("API create class failed, using Firestore:", err);
      }

      if (!newCls) {
        newCls = await fsCreateClass(newClassName);
      }

      setNewClassName("");
      setShowAddClass(false);
      setSuccess(`Đã tạo lớp ${newCls.name} thành công!`);
      setTimeout(() => setSuccess(null), 3000);
      await fetchClasses();
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async (classId: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa lớp "${name}" không? Toàn bộ dữ liệu giao đề liên quan cũng sẽ bị xóa.`)) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let deleted = false;
      try {
        const res = await fetch(`/api/classes/${classId}`, { method: "DELETE" });
        if (res.ok) deleted = true;
      } catch (err) {
        console.warn("API delete class failed, using Firestore:", err);
      }

      if (!deleted) {
        await fsDeleteClass(classId);
      }

      setSuccess("Đã xóa lớp học thành công");
      setTimeout(() => setSuccess(null), 3000);
      setSelectedClass(null);
      await fetchClasses();
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !newStudentName.trim()) return;

    setLoading(true);
    setError(null);
    try {
      let added = false;
      try {
        const res = await fetch(`/api/classes/${selectedClass.id}/students`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newStudentName,
            studentCode: newStudentCode
          }),
        });
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          added = true;
        }
      } catch (err) {
        console.warn("API add student failed, using Firestore:", err);
      }

      if (!added) {
        await fsAddStudent(selectedClass.id, newStudentName, newStudentCode);
      }

      setNewStudentName("");
      setNewStudentCode("");
      setShowAddStudent(false);
      setSuccess("Đã thêm học sinh thành công!");
      setTimeout(() => setSuccess(null), 3000);
      await fetchClasses();
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !editingStudent || !newStudentName.trim()) return;

    setLoading(true);
    setError(null);
    try {
      let edited = false;
      try {
        const res = await fetch(`/api/classes/${selectedClass.id}/students/${editingStudent.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newStudentName,
            studentCode: newStudentCode
          }),
        });
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          edited = true;
        }
      } catch (err) {
        console.warn("API edit student failed, using Firestore:", err);
      }

      if (!edited) {
        await fsUpdateStudent(selectedClass.id, editingStudent.id, newStudentName, newStudentCode);
      }

      setEditingStudent(null);
      setNewStudentName("");
      setNewStudentCode("");
      setSuccess("Cập nhật thông tin học sinh thành công!");
      setTimeout(() => setSuccess(null), 3000);
      await fetchClasses();
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (studentId: string, name: string) => {
    if (!selectedClass) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa học sinh "${name}" khỏi lớp không?`)) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let deleted = false;
      try {
        const res = await fetch(`/api/classes/${selectedClass.id}/students/${studentId}`, {
          method: "DELETE",
        });
        if (res.ok) deleted = true;
      } catch (err) {
        console.warn("API delete student failed, using Firestore:", err);
      }

      if (!deleted) {
        await fsDeleteStudent(selectedClass.id, studentId);
      }

      setSuccess("Xóa học sinh thành công!");
      setTimeout(() => setSuccess(null), 3000);
      await fetchClasses();
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div id="class-manager-root" className="space-y-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span className="bg-indigo-100 p-2 rounded-2xl text-indigo-600 block shadow-sm">
              <Users className="w-7 h-7" />
            </span>
            Quản lý Lớp học & Học sinh
          </h1>
          <p className="text-slate-500 font-medium mt-1">Tạo lớp học, lấy mã lớp cho học sinh tham gia và quản lý danh sách học sinh.</p>
        </div>
        {!selectedClass && (
          <button
            id="btn-open-add-class"
            onClick={() => setShowAddClass(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl font-extrabold text-sm cursor-pointer shadow-lg shadow-indigo-100 active:scale-[0.98] transition-all"
          >
            <Plus className="w-5 h-5" />
            Tạo Lớp học mới
          </button>
        )}
      </div>

      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-2xl flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <span className="text-rose-800 font-bold text-xs">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-2xl flex items-start gap-2.5">
          <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <span className="text-emerald-800 font-bold text-xs">{success}</span>
        </div>
      )}

      {/* Grid view of classes */}
      {!selectedClass ? (
        <div className="space-y-6">
          {showAddClass && (
            <div className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-xl shadow-slate-200/50 max-w-md animate-fadeIn">
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-black text-slate-900 text-lg">Tạo Lớp Học Mới</h3>
                <button onClick={() => setShowAddClass(false)} className="text-slate-400 hover:text-slate-600 p-1 bg-slate-50 rounded-xl transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleAddClass} className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Tên lớp học</label>
                  <input
                    type="text"
                    required
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="Ví dụ: Lớp 5A - Tin học sáng thứ 3"
                    className="w-full bg-slate-50 border border-slate-100 focus:bg-white rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-800"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddClass(false)}
                    className="border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-100 active:scale-[0.98] transition-all"
                  >
                    {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    Tạo lớp học
                  </button>
                </div>
              </form>
            </div>
          )}

          {classes.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-[32px] p-12 text-center shadow-sm">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4 bg-slate-50 p-3 rounded-2xl" />
              <h3 className="font-black text-slate-800 text-lg">Chưa có lớp học nào</h3>
              <p className="text-slate-500 font-medium text-sm mt-2 max-w-sm mx-auto leading-relaxed">
                Hãy tạo lớp học đầu tiên để có thể quản lý danh sách học sinh và giao bài kiểm tra thông minh nhé!
              </p>
              <button
                onClick={() => setShowAddClass(true)}
                className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl text-sm font-black inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-100 active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" /> Tạo Lớp học ngay
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map((cls) => (
                <div
                  key={cls.id}
                  className="bg-white border border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-slate-200/40 rounded-[28px] p-6 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold px-3 py-1 rounded-xl">
                        Mã kết nối: {cls.classCode}
                      </span>
                      <button
                        onClick={() => handleDeleteClass(cls.id, cls.name)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 bg-slate-50 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                        title="Xóa lớp học"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-lg leading-tight hover:text-indigo-600 transition-all">
                        {cls.name}
                      </h3>
                      <p className="text-slate-500 font-bold text-xs flex items-center gap-1.5 mt-2">
                        <Users className="w-4 h-4 text-indigo-500" />
                        Sĩ số: <strong className="text-slate-900">{cls.students?.length || 0}</strong> học sinh
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedClass(cls);
                      setError(null);
                    }}
                    className="w-full text-center border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-600 hover:text-white text-indigo-700 font-black py-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                  >
                    Quản lý học sinh
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Detailed Class View - Managing Students
        <div className="bg-white border border-slate-100 rounded-[32px] p-6 md:p-8 shadow-sm animate-fadeIn space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedClass(null)}
                className="hover:bg-slate-100 p-2.5 rounded-2xl text-slate-600 transition-colors cursor-pointer border border-slate-100 bg-slate-50"
                title="Quay lại danh sách"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="font-black text-xl text-slate-900 tracking-tight leading-tight">{selectedClass.name}</h2>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-slate-500 text-xs font-bold">
                    Mã kết nối lớp: <strong className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100 font-mono text-sm">{selectedClass.classCode}</strong>
                  </span>
                  <button
                    onClick={() => copyToClipboard(selectedClass.classCode)}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors"
                    title="Sao chép mã kết nối"
                  >
                    {copiedCode === selectedClass.classCode ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center">
              <button
                id="btn-import-excel-trigger"
                onClick={() => {
                  setImportFile(null);
                  setParsedData(null);
                  setValidationError(null);
                  setImportResult(null);
                  setDuplicateStrategy("skip");
                  setShowImportExcel(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-100 active:scale-[0.98] transition-all"
              >
                <FileSpreadsheet className="w-4 h-4" /> Nhập học sinh từ Excel
              </button>
              <button
                id="btn-add-student"
                onClick={() => {
                  setEditingStudent(null);
                  setNewStudentName("");
                  setNewStudentCode("");
                  setShowAddStudent(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-100 active:scale-[0.98] transition-all"
              >
                <Plus className="w-4 h-4" /> Thêm học sinh
              </button>
            </div>
          </div>

          {/* Form wrapper */}
          {(showAddStudent || editingStudent) && (
            <div className="bg-slate-50 border border-slate-200/60 rounded-[24px] p-6 mb-6 animate-fadeIn space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-slate-800 text-sm">
                  {editingStudent ? `Chỉnh sửa thông tin: ${editingStudent.name}` : "Thêm Học Sinh Mới"}
                </h3>
                <button
                  onClick={() => {
                    setShowAddStudent(false);
                    setEditingStudent(null);
                    setNewStudentName("");
                    setNewStudentCode("");
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1 bg-white border border-slate-100 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={editingStudent ? handleEditStudent : handleAddStudent} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Họ và tên học sinh *</label>
                  <input
                    type="text"
                    required
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn Hải"
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-2xl px-4 py-3 text-sm focus:outline-none transition-all font-medium text-slate-800"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Mã học sinh (Dùng đăng nhập - Tự sinh nếu trống)</label>
                  <input
                    type="text"
                    value={newStudentCode}
                    onChange={(e) => setNewStudentCode(e.target.value)}
                    placeholder={`Ví dụ: HS${selectedClass.classCode}01`}
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-2xl px-4 py-3 text-sm uppercase focus:outline-none transition-all font-bold text-slate-800"
                  />
                </div>
                <div className="md:col-span-2 flex justify-end gap-2 text-sm mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddStudent(false);
                      setEditingStudent(null);
                      setNewStudentName("");
                      setNewStudentCode("");
                    }}
                    className="border border-slate-200 hover:bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-md shadow-indigo-100 active:scale-[0.98] transition-all"
                  >
                    {editingStudent ? "Lưu thay đổi" : "Thêm vào danh sách"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Students List Table */}
          {!selectedClass.students || selectedClass.students.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3 bg-white p-2 rounded-xl" />
              <h4 className="font-black text-slate-700">Lớp học này chưa có học sinh</h4>
              <p className="text-slate-400 text-xs mt-2 max-w-sm mx-auto leading-relaxed">
                Hãy click nút "Thêm học sinh" ở góc trên để bổ sung các em học sinh tiểu học vào lớp học nhé.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-100 shadow-xs bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100">
                      <th className="py-4 px-5 w-16">STT</th>
                      <th className="py-4 px-5">Họ và tên</th>
                      <th className="py-4 px-5">Mã đăng nhập của học sinh</th>
                      <th className="py-4 px-5 text-right w-32">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {selectedClass.students.map((student, index) => (
                      <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-5 text-slate-400 font-bold">{index + 1}</td>
                        <td className="py-4 px-5 text-slate-800 font-extrabold text-sm">{student.name}</td>
                        <td className="py-4 px-5">
                          <span className="font-mono bg-slate-100 border border-slate-200/40 text-slate-700 px-3 py-1 rounded-xl text-xs font-bold inline-flex items-center gap-1">
                            {student.studentCode}
                            <button
                              onClick={() => copyToClipboard(student.studentCode)}
                              className="hover:bg-slate-200 p-1 rounded text-slate-400 hover:text-indigo-600 transition-all cursor-pointer ml-1"
                              title="Sao chép mã học sinh"
                            >
                              {copiedCode === student.studentCode ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => {
                                setEditingStudent(student);
                                setNewStudentName(student.name);
                                setNewStudentCode(student.studentCode);
                                setShowAddStudent(false);
                              }}
                              className="p-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 rounded-xl transition-all cursor-pointer border border-transparent hover:border-indigo-100"
                              title="Sửa thông tin"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(student.id, student.name)}
                              className="p-2 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded-xl transition-all cursor-pointer border border-transparent hover:border-rose-100"
                              title="Xóa học sinh"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hidden input for Excel file upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx, .xls, .csv"
        className="hidden"
        id="excel-file-uploader"
      />

      {/* Modal Import Excel */}
      {showImportExcel && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white border border-slate-100 rounded-[32px] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-scaleUp">
            {/* Header */}
            <div className="border-b border-slate-100 p-6 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 tracking-tight text-base">Nhập học sinh từ Excel</h3>
                  <p className="text-slate-400 text-[11px] font-medium">Nhập danh sách học sinh vào lớp {selectedClass?.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowImportExcel(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-6 space-y-6 flex-1">
              {!importResult ? (
                <>
                  {/* Step 1: Guide & Template & Dropzone */}
                  {!parsedData && (
                    <div className="space-y-4">
                      {/* Guide Banner */}
                      <div className="bg-amber-50 border border-amber-200/50 rounded-2xl p-4 flex gap-3 text-xs text-amber-900">
                        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-bold">Định dạng File Excel yêu cầu:</p>
                          <ul className="list-disc pl-4 space-y-1 text-amber-800">
                            <li>File Excel chứa các cột bắt buộc: <strong className="font-black text-amber-950">Họ và tên</strong> và <strong className="font-black text-amber-950">Mã học sinh</strong>.</li>
                            <li>Có thể sử dụng cột thứ tự <strong className="font-medium text-amber-950">STT</strong> để đánh số (không bắt buộc).</li>
                            <li>Tải file mẫu bên dưới để đảm bảo định dạng nhập chính xác nhất.</li>
                          </ul>
                        </div>
                      </div>

                      {/* Download Template Button */}
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={handleDownloadTemplate}
                          className="px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-black flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-600" /> Tải file Excel mẫu
                        </button>
                      </div>

                      {/* Drag and Drop Zone */}
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={triggerFileInput}
                        className={`border-2 border-dashed rounded-[24px] p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                          isDragging
                            ? "border-emerald-500 bg-emerald-50/50 text-emerald-800"
                            : "border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-500"
                        }`}
                      >
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isDragging ? "bg-emerald-100 text-emerald-600 animate-bounce" : "bg-slate-100 text-slate-400"}`}>
                          <Upload className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-slate-800 text-sm font-black">Kéo và thả file Excel vào đây</p>
                          <p className="text-slate-400 text-xs mt-1">hoặc click để chọn file từ máy tính (.xlsx, .xls, .csv)</p>
                        </div>
                      </div>

                      {validationError && (
                        <div className="bg-rose-50 border border-rose-200/50 rounded-2xl p-4 flex gap-2.5 text-xs text-rose-800 animate-fadeIn">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <p className="font-medium">{validationError}</p>
                        </div>
                      )}

                      {parsing && (
                        <div className="flex flex-col items-center justify-center py-6 gap-2 text-slate-500">
                          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                          <p className="text-xs font-black">Đang đọc và kiểm tra dữ liệu file Excel...</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 2: Validate results & Confirm import */}
                  {parsedData && (
                    <div className="space-y-6">
                      {/* Summary Badges */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl text-center">
                          <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider block mb-1">Tổng dòng</span>
                          <span className="text-slate-800 font-mono font-black text-lg">{parsedData.totalRows}</span>
                        </div>
                        <div className="bg-emerald-50/50 border border-emerald-100/30 p-3.5 rounded-2xl text-center">
                          <span className="text-emerald-500 text-[10px] font-black uppercase tracking-wider block mb-1">Hợp lệ</span>
                          <span className="text-emerald-700 font-mono font-black text-lg">{parsedData.validStudents.length}</span>
                        </div>
                        <div className="bg-amber-50/50 border border-amber-100/30 p-3.5 rounded-2xl text-center">
                          <span className="text-amber-500 text-[10px] font-black uppercase tracking-wider block mb-1">Trùng mã</span>
                          <span className="text-amber-700 font-mono font-black text-lg">{parsedData.duplicates.length}</span>
                        </div>
                        <div className="bg-rose-50/50 border border-rose-100/30 p-3.5 rounded-2xl text-center">
                          <span className="text-rose-500 text-[10px] font-black uppercase tracking-wider block mb-1">Bị lỗi</span>
                          <span className="text-rose-700 font-mono font-black text-lg">{parsedData.errors.length}</span>
                        </div>
                      </div>

                      {/* Info alert */}
                      <div className="bg-indigo-50/70 border border-indigo-100/30 rounded-2xl p-4 flex gap-3 text-xs text-indigo-900">
                        <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />
                        <div>
                          <p className="font-bold text-indigo-950">Bạn sắp thêm {parsedData.validStudents.length} học sinh vào lớp {selectedClass?.name}.</p>
                          <p className="text-indigo-800/85 mt-0.5">Vui lòng kiểm tra kỹ danh sách hiển thị bên dưới trước khi bấm xác nhận nhập.</p>
                        </div>
                      </div>

                      {/* Duplicate handling settings */}
                      {parsedData.duplicates.length > 0 && (
                        <div className="border border-amber-200 bg-amber-50/40 rounded-2xl p-4 space-y-2.5">
                          <div className="flex items-center gap-1.5 text-amber-900 text-xs font-bold">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            <span>Phát hiện {parsedData.duplicates.length} học sinh trùng mã học sinh:</span>
                          </div>
                          <div className="flex flex-col gap-2 pl-5.5 text-xs">
                            <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                              <input
                                type="radio"
                                name="duplicateStrategy"
                                checked={duplicateStrategy === "skip"}
                                onChange={() => setDuplicateStrategy("skip")}
                                className="accent-emerald-600 w-4 h-4"
                              />
                              <span><strong className="font-black text-slate-900">Bỏ qua học sinh trùng</strong> (Chỉ thêm những học sinh mới hợp lệ)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                              <input
                                type="radio"
                                name="duplicateStrategy"
                                checked={duplicateStrategy === "cancel"}
                                onChange={() => setDuplicateStrategy("cancel")}
                                className="accent-emerald-600 w-4 h-4"
                              />
                              <span><strong className="font-black text-rose-600">Hủy thao tác nhập</strong> (Dừng toàn bộ nếu có bất kỳ mã nào trùng lặp)</span>
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Detailed list of errors if any */}
                      {parsedData.errors.length > 0 && (
                        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 space-y-1.5">
                          <p className="text-xs font-black text-rose-900 flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 text-rose-600" />
                            Có {parsedData.errors.length} dòng bị lỗi định dạng:
                          </p>
                          <div className="max-h-24 overflow-y-auto text-[11px] text-rose-800 space-y-1.5 pl-5.5 list-disc">
                            {parsedData.errors.map((err: any, idx: number) => (
                              <div key={idx}>• Dòng {err.rowNum}: {err.message}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Preview Table */}
                      <div className="space-y-2">
                        <p className="text-xs font-black text-slate-700 uppercase tracking-wider">Xem trước dữ liệu nhập ({parsedData.validStudents.length + parsedData.duplicates.length} dòng)</p>
                        <div className="overflow-hidden rounded-2xl border border-slate-100 max-h-48 overflow-y-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 sticky top-0">
                                <th className="py-2.5 px-4 w-12 text-center">STT</th>
                                <th className="py-2.5 px-4">Họ và tên</th>
                                <th className="py-2.5 px-4">Mã học sinh</th>
                                <th className="py-2.5 px-4 w-28 text-center">Trạng thái</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {parsedData.validStudents.map((s: any, idx: number) => (
                                <tr key={idx} className="hover:bg-slate-50/30">
                                  <td className="py-2 px-4 text-slate-400 font-bold text-center">{idx + 1}</td>
                                  <td className="py-2 px-4 font-black text-slate-800">{s.name}</td>
                                  <td className="py-2 px-4 font-mono font-bold text-slate-600">{s.studentCode}</td>
                                  <td className="py-2 px-4 text-center">
                                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md">Hợp lệ</span>
                                  </td>
                                </tr>
                              ))}
                              {parsedData.duplicates.map((s: any, idx: number) => (
                                <tr key={`dup-${idx}`} className="bg-amber-50/20 text-amber-800 hover:bg-amber-50/30">
                                  <td className="py-2 px-4 text-slate-400 font-bold text-center">{parsedData.validStudents.length + idx + 1}</td>
                                  <td className="py-2 px-4 font-black">{s.name}</td>
                                  <td className="py-2 px-4 font-mono font-bold">{s.studentCode}</td>
                                  <td className="py-2 px-4 text-center">
                                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md">Trùng</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {validationError && (
                        <div className="bg-rose-50 border border-rose-200/50 rounded-2xl p-4 flex gap-2.5 text-xs text-rose-800">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <p className="font-medium">{validationError}</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                /* Step 3: Success report */
                <div className="py-8 text-center space-y-6 animate-scaleUp">
                  <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="w-12 h-12" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-black text-slate-900 tracking-tight">🎉 Nhập danh sách thành công!</h4>
                    <p className="text-slate-500 text-xs font-medium">Danh sách học sinh lớp {selectedClass?.name} đã được cập nhật thành công</p>
                  </div>

                  {/* Summary card */}
                  <div className="bg-slate-50 border border-slate-100/60 rounded-3xl p-6 max-w-sm mx-auto space-y-3.5 text-left text-xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="font-bold flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-500" /> Đã thêm mới:</span>
                      <strong className="text-emerald-700 font-mono text-sm">{importResult.added} học sinh</strong>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-amber-500" /> Bỏ qua trùng:</span>
                      <strong className="text-amber-700 font-mono text-sm">{importResult.skipped} học sinh trùng</strong>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="font-bold flex items-center gap-1.5"><FileText className="w-4 h-4 text-slate-400" /> Dòng lỗi bị loại:</span>
                      <strong className="text-rose-700 font-mono text-sm">{importResult.errors} dòng</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 p-5 bg-slate-50/50 flex justify-end gap-3 rounded-b-[32px] shrink-0">
              {!importResult ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (parsedData) {
                        setParsedData(null);
                        setValidationError(null);
                      } else {
                        setShowImportExcel(false);
                      }
                    }}
                    className="px-5 py-3 rounded-2xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-black cursor-pointer transition-colors"
                  >
                    {parsedData ? "Quay lại" : "Hủy bỏ"}
                  </button>

                  {parsedData && (
                    <button
                      type="button"
                      disabled={loading || (duplicateStrategy === "cancel" && parsedData.duplicates.length > 0)}
                      onClick={handleConfirmImport}
                      className={`px-5 py-3 rounded-2xl text-white text-xs font-black cursor-pointer transition-all shadow-lg ${
                        loading || (duplicateStrategy === "cancel" && parsedData.duplicates.length > 0)
                          ? "bg-slate-300 shadow-none cursor-not-allowed"
                          : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100 active:scale-[0.98]"
                      }`}
                    >
                      {loading ? (
                        <span className="flex items-center gap-1.5">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang lưu dữ liệu...
                        </span>
                      ) : (
                        "Xác nhận nhập danh sách"
                      )}
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowImportExcel(false)}
                  className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black cursor-pointer shadow-lg shadow-indigo-100 active:scale-[0.98] transition-all"
                >
                  Quay lại lớp học
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
