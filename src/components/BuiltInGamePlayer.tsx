import React, { useState, useEffect } from "react";
import { 
  Trophy, Star, RefreshCw, CheckCircle2, XCircle, Heart, 
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Zap, Sparkles, Award
} from "lucide-react";

interface BuiltInGamePlayerProps {
  gameKey: string; // "typing" | "quiz" | "scratch-maze"
  onClose?: () => void;
}

export default function BuiltInGamePlayer({ gameKey, onClose }: BuiltInGamePlayerProps) {
  if (gameKey === "typing") {
    return <TypingGame />;
  } else if (gameKey === "quiz") {
    return <QuizGame />;
  } else if (gameKey === "scratch-maze") {
    return <ScratchMazeGame />;
  }

  return (
    <div className="p-8 text-center text-white space-y-4">
      <Trophy className="w-12 h-12 text-amber-400 mx-auto" />
      <h3 className="text-xl font-black">Trò chơi tích hợp đang sẵn sàng!</h3>
    </div>
  );
}

// ==========================================
// GAME 1: VUA GÕ BÀN PHÍM (TYPING MASTER)
// ==========================================
function TypingGame() {
  const WORD_LIST = [
    "f d j k a s l ; g h",
    "fjfj dkd3 slsl a;a;",
    "tin hoc 3",
    "ban phim va chuot",
    "hoc tap thong minh",
    "tien bo moi ngay",
    "scratch lap trinh",
    "ai smart test"
  ];

  const [wordIndex, setWordIndex] = useState(0);
  const [inputVal, setInputVal] = useState("");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    let timer: any;
    if (gameActive && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && gameActive) {
      setGameActive(false);
      setGameOver(true);
    }
    return () => clearInterval(timer);
  }, [gameActive, timeLeft]);

  const handleStart = () => {
    setScore(0);
    setStreak(0);
    setWordIndex(0);
    setInputVal("");
    setTimeLeft(60);
    setGameActive(true);
    setGameOver(false);
  };

  const targetWord = WORD_LIST[wordIndex % WORD_LIST.length];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!gameActive) setGameActive(true);
    const val = e.target.value;
    setInputVal(val);

    if (val === targetWord) {
      setScore((s) => s + 10 + streak * 2);
      setStreak((st) => st + 1);
      setInputVal("");
      setWordIndex((i) => (i + 1) % WORD_LIST.length);
    }
  };

  return (
    <div className="bg-slate-900 text-white p-6 md:p-8 rounded-3xl h-full flex flex-col justify-between max-w-3xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⌨️</span>
          <div>
            <h2 className="text-lg font-black text-amber-400">Vua Gõ Bàn Phím (Typing Speed)</h2>
            <p className="text-xs text-slate-400">Gõ chính xác đoạn văn bản bên dưới càng nhanh càng tốt!</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-center">
            <span className="text-[10px] text-slate-400 block font-bold">THỜI GIAN</span>
            <span className={`text-base font-black ${timeLeft <= 10 ? "text-rose-400 animate-pulse" : "text-emerald-400"}`}>
              {timeLeft}s
            </span>
          </div>

          <div className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-center">
            <span className="text-[10px] text-slate-400 block font-bold">ĐIỂM SỐ</span>
            <span className="text-base font-black text-amber-400">{score}</span>
          </div>
        </div>
      </div>

      {/* Main Game Screen */}
      {!gameActive && !gameOver ? (
        <div className="text-center my-auto py-12 space-y-4 bg-slate-950/60 p-8 rounded-3xl border border-slate-800">
          <Trophy className="w-16 h-16 text-amber-400 mx-auto animate-bounce" />
          <h3 className="text-xl font-black text-white">Sẵn sàng gõ bàn phím siêu tốc?</h3>
          <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
            Kiểm tra phản xạ ngón tay và khả năng định vị phím trên bàn phím chuẩn. Nhấn nút bắt đầu để thử sức nhé!
          </p>
          <button
            onClick={handleStart}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-sm px-8 py-4 rounded-2xl shadow-xl shadow-amber-400/20 hover:scale-105 transition-all cursor-pointer"
          >
            <Zap className="w-5 h-5 fill-slate-950" />
            BẮT ĐẦU CHƠI NGAY
          </button>
        </div>
      ) : gameOver ? (
        <div className="text-center my-auto py-8 space-y-4 bg-slate-950/60 p-8 rounded-3xl border border-amber-500/30">
          <Award className="w-16 h-16 text-amber-400 mx-auto" />
          <h3 className="text-2xl font-black text-amber-300">HOÀN THÀNH THỬ THÁCH!</h3>
          <div className="inline-block bg-slate-800 border border-slate-700 p-4 px-8 rounded-2xl">
            <span className="text-xs text-slate-400 block font-bold">TỔNG ĐIỂM ĐẠT ĐƯỢC</span>
            <span className="text-3xl font-black text-amber-400">{score} Điểm</span>
          </div>
          <div>
            <button
              onClick={handleStart}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm px-6 py-3.5 rounded-2xl transition-all cursor-pointer shadow-lg"
            >
              <RefreshCw className="w-4 h-4" />
              Chơi lại lượt mới
            </button>
          </div>
        </div>
      ) : (
        <div className="my-auto space-y-6">
          {/* Target Word Display */}
          <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 text-center space-y-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">NỘI DUNG CẦN GÕ</span>
            <div className="text-2xl md:text-3xl font-mono font-black text-amber-300 tracking-wider">
              {targetWord.split("").map((char, idx) => {
                let colorClass = "text-slate-500";
                if (idx < inputVal.length) {
                  colorClass = inputVal[idx] === char ? "text-emerald-400 bg-emerald-950/80 rounded px-1" : "text-rose-400 bg-rose-950/80 rounded px-1";
                } else if (idx === inputVal.length) {
                  colorClass = "text-white underline underline-offset-4 decoration-amber-400 font-black bg-slate-800 rounded px-1";
                }
                return (
                  <span key={idx} className={colorClass}>
                    {char === " " ? "␣" : char}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Input Box */}
          <div>
            <input
              type="text"
              value={inputVal}
              onChange={handleInputChange}
              autoFocus
              placeholder="Gõ lại câu phía trên tại đây..."
              className="w-full bg-slate-800 border-2 border-amber-500/80 focus:border-amber-400 rounded-2xl px-6 py-4 text-lg font-mono text-white text-center focus:outline-none shadow-xl transition-all"
            />
          </div>

          {streak > 1 && (
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 text-xs font-black bg-amber-400/20 text-amber-300 border border-amber-400/30 px-4 py-1.5 rounded-full animate-bounce">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Chuỗi gõ đúng x{streak}! (+Bonus điểm)
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// GAME 2: ĐỐ VUI TIN HỌC (QUIZ CHALLENGE)
// ==========================================
function QuizGame() {
  const QUESTIONS = [
    {
      q: "Bộ phận nào của máy tính giúp điều khiển con trỏ trên màn hình?",
      options: ["Bàn phím", "Con chuột", "Màn hình", "Thân máy"],
      correct: 1
    },
    {
      q: "Để gõ chữ hoa trong câu, em cần nhấn giữ phím nào?",
      options: ["Enter", "Spacebar", "Shift", "Backspace"],
      correct: 2
    },
    {
      q: "Trong Scratch, nhân vật mặc định xuất hiện là con vật gì?",
      options: ["Con Chó", "Con Mèo", "Con Khỉ", "Con Chim"],
      correct: 1
    },
    {
      q: "Hành động nào sau đây giúp giữ an toàn khi sử dụng Internet?",
      options: [
        "Chia sẻ mật khẩu cho người lạ",
        "Tải tệp từ trang web không rõ nguồn gốc",
        "Giữ kín thông tin cá nhân và mật khẩu",
        "Kết bạn với tất cả tài khoản lạ"
      ],
      correct: 2
    }
  ];

  const [qIndex, setQIndex] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [gameOver, setGameOver] = useState(false);

  const currentQ = QUESTIONS[qIndex];

  const handleSelect = (idx: number) => {
    if (selectedOpt !== null) return;
    setSelectedOpt(idx);

    setTimeout(() => {
      if (idx === currentQ.correct) {
        setScore((s) => s + 100);
      } else {
        setHearts((h) => {
          if (h <= 1) setGameOver(true);
          return h - 1;
        });
      }

      if (qIndex + 1 < QUESTIONS.length && hearts > (idx === currentQ.correct ? 0 : 1)) {
        setQIndex((i) => i + 1);
        setSelectedOpt(null);
      } else {
        setGameOver(true);
      }
    }, 1200);
  };

  const handleRestart = () => {
    setQIndex(0);
    setSelectedOpt(null);
    setScore(0);
    setHearts(3);
    setGameOver(false);
  };

  return (
    <div className="bg-slate-900 text-white p-6 md:p-8 rounded-3xl h-full flex flex-col justify-between max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🧩</span>
          <div>
            <h2 className="text-lg font-black text-amber-400">Đố Vui Tin Học & An Toàn Mạng</h2>
            <p className="text-xs text-slate-400">Câu hỏi {qIndex + 1} / {QUESTIONS.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
            {Array.from({ length: 3 }).map((_, i) => (
              <Heart
                key={i}
                className={`w-4 h-4 ${i < hearts ? "text-rose-500 fill-rose-500" : "text-slate-600"}`}
              />
            ))}
          </div>

          <div className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-center">
            <span className="text-[10px] text-slate-400 block font-bold">ĐIỂM SỐ</span>
            <span className="text-base font-black text-amber-400">{score}</span>
          </div>
        </div>
      </div>

      {gameOver ? (
        <div className="text-center my-auto py-8 space-y-4 bg-slate-950/60 p-8 rounded-3xl border border-slate-800">
          <Trophy className="w-16 h-16 text-amber-400 mx-auto" />
          <h3 className="text-2xl font-black text-white">KẾT THÚC VÒNG ĐỐ VUI!</h3>
          <p className="text-sm font-bold text-amber-300">Em đạt tổng điểm: {score} Điểm</p>
          <button
            onClick={handleRestart}
            className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm px-6 py-3.5 rounded-2xl transition-all cursor-pointer shadow-lg"
          >
            <RefreshCw className="w-4 h-4" />
            Thử sức lại
          </button>
        </div>
      ) : (
        <div className="my-auto space-y-6">
          <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800">
            <h3 className="text-lg font-black text-amber-200 leading-snug">{currentQ.q}</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentQ.options.map((opt, idx) => {
              let btnClass = "bg-slate-800 border-slate-700 hover:bg-slate-750 text-white";
              if (selectedOpt !== null) {
                if (idx === currentQ.correct) {
                  btnClass = "bg-emerald-600 border-emerald-400 text-white font-black";
                } else if (idx === selectedOpt) {
                  btnClass = "bg-rose-600 border-rose-400 text-white font-black";
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  disabled={selectedOpt !== null}
                  className={`p-4 rounded-2xl border text-left text-sm font-bold transition-all cursor-pointer flex items-center justify-between ${btnClass}`}
                >
                  <span>{opt}</span>
                  {selectedOpt !== null && idx === currentQ.correct && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
                  )}
                  {selectedOpt !== null && idx === selectedOpt && idx !== currentQ.correct && (
                    <XCircle className="w-5 h-5 text-rose-200 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// GAME 3: SCRATCH MAZE GAME
// ==========================================
function ScratchMazeGame() {
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [collected, setCollected] = useState<number[]>([]);
  const targetTotal = 3;

  const items = [
    { id: 1, x: 2, y: 0, label: "💻 RAM" },
    { id: 2, x: 1, y: 2, label: "🖱️ Chuột" },
    { id: 3, x: 3, y: 3, label: "⌨️ Bàn phím" }
  ];

  const move = (dx: number, dy: number) => {
    const newX = Math.max(0, Math.min(3, posX + dx));
    const newY = Math.max(0, Math.min(3, posY + dy));
    setPosX(newX);
    setPosY(newY);

    // Check item pickup
    const found = items.find((i) => i.x === newX && i.y === newY);
    if (found && !collected.includes(found.id)) {
      setCollected((c) => [...c, found.id]);
    }
  };

  return (
    <div className="bg-slate-900 text-white p-6 rounded-3xl h-full flex flex-col justify-between max-w-xl mx-auto space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="text-base font-black text-amber-400">🐱 Thám Tử Mê Cung Scratch</h3>
        <span className="text-xs font-bold bg-amber-400/20 text-amber-300 px-3 py-1 rounded-full">
          Đã nhặt: {collected.length} / {targetTotal}
        </span>
      </div>

      <div className="bg-slate-950 p-4 rounded-3xl border border-slate-800">
        {/* 4x4 Grid */}
        <div className="grid grid-cols-4 gap-2 aspect-square max-w-sm mx-auto">
          {Array.from({ length: 16 }).map((_, idx) => {
            const x = idx % 4;
            const y = Math.floor(idx / 4);

            const isCat = posX === x && posY === y;
            const item = items.find((i) => i.x === x && i.y === y && !collected.includes(i.id));

            return (
              <div
                key={idx}
                className="bg-slate-800/80 rounded-2xl border border-slate-700/60 flex items-center justify-center text-xl relative"
              >
                {isCat ? (
                  <span className="text-2xl animate-bounce">🐱</span>
                ) : item ? (
                  <span className="text-lg animate-pulse">{item.label.split(" ")[0]}</span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {collected.length === targetTotal ? (
        <div className="bg-emerald-950/80 border border-emerald-500/50 p-4 rounded-2xl text-center space-y-2">
          <Sparkles className="w-8 h-8 text-emerald-400 mx-auto animate-bounce" />
          <h4 className="text-base font-black text-emerald-300">XUẤT SẮC! MÈO SCRATCH ĐÃ THU THẬP ĐỦ LINH KIỆN!</h4>
          <button
            onClick={() => {
              setPosX(0);
              setPosY(0);
              setCollected([]);
            }}
            className="text-xs font-bold text-slate-950 bg-amber-400 px-4 py-2 rounded-xl"
          >
            Chơi lại
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <button onClick={() => move(0, -1)} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold">
            <ArrowUp className="w-5 h-5" />
          </button>
          <div className="flex gap-4">
            <button onClick={() => move(-1, 0)} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button onClick={() => move(0, 1)} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold">
              <ArrowDown className="w-5 h-5" />
            </button>
            <button onClick={() => move(1, 0)} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold">
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
