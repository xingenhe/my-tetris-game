import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

const COLS = 10;
const ROWS = 20;
const EMPTY = 0;

const THEME = {
  bg: "#f7f4ee",
  panel: "#fffdf8",
  border: "#d7d2c8",
  grid: "#ece7dd",
  text: "#4a4a4a",
  subtext: "#7b766d",
  shadow: "0 10px 30px rgba(84, 74, 60, 0.08)",
};

const PIECES = [
  { key: "I", color: "#7ea8a1", matrix: [[1, 1, 1, 1]] },
  { key: "O", color: "#e3b56c", matrix: [[1, 1], [1, 1]] },
  { key: "T", color: "#9d8fbf", matrix: [[0, 1, 0], [1, 1, 1]] },
  { key: "L", color: "#c78d64", matrix: [[0, 0, 1], [1, 1, 1]] },
  { key: "J", color: "#7b97c6", matrix: [[1, 0, 0], [1, 1, 1]] },
  { key: "S", color: "#8cb18a", matrix: [[0, 1, 1], [1, 1, 0]] },
  { key: "Z", color: "#d18b85", matrix: [[1, 1, 0], [0, 1, 1]] },
];

const MODE_CONFIG = {
  relax: { label: "放松", speed: 900, autoAccelerate: false },
  gentle: { label: "温和", speed: 700, autoAccelerate: true },
  classic: { label: "经典", speed: 550, autoAccelerate: true },
};

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
}

function cloneMatrix(matrix) {
  return matrix.map((row) => [...row]);
}

function rotateMatrix(matrix) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const rotated = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      rotated[x][rows - 1 - y] = matrix[y][x];
    }
  }
  return rotated;
}

function randomPiece() {
  const base = PIECES[Math.floor(Math.random() * PIECES.length)];
  return {
    key: base.key,
    color: base.color,
    matrix: cloneMatrix(base.matrix),
  };
}

function getStartPosition(matrix) {
  return {
    x: Math.floor((COLS - matrix[0].length) / 2),
    y: 0,
  };
}

function isValidMove(board, piece, position) {
  for (let y = 0; y < piece.matrix.length; y++) {
    for (let x = 0; x < piece.matrix[y].length; x++) {
      if (!piece.matrix[y][x]) continue;

      const nx = position.x + x;
      const ny = position.y + y;

      if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
      if (ny >= 0 && board[ny][nx] !== EMPTY) return false;
    }
  }
  return true;
}

function mergePiece(board, piece, position) {
  const next = board.map((row) => [...row]);
  for (let y = 0; y < piece.matrix.length; y++) {
    for (let x = 0; x < piece.matrix[y].length; x++) {
      if (!piece.matrix[y][x]) continue;
      const ny = position.y + y;
      const nx = position.x + x;
      if (ny >= 0) next[ny][nx] = piece.color;
    }
  }
  return next;
}

function clearLines(board) {
  const kept = board.filter((row) => row.some((cell) => cell === EMPTY));
  const lines = ROWS - kept.length;
  const fresh = Array.from({ length: lines }, () => Array(COLS).fill(EMPTY));
  return {
    board: [...fresh, ...kept],
    lines,
  };
}

function computeGhostY(board, piece, position) {
  let y = position.y;
  while (isValidMove(board, piece, { x: position.x, y: y + 1 })) {
    y += 1;
  }
  return y;
}

function getDisplayBoard(board, piece, position, showGhost = true) {
  const ghostY = computeGhostY(board, piece, position);
  const display = board.map((row) => [...row]);

  if (showGhost) {
    for (let y = 0; y < piece.matrix.length; y++) {
      for (let x = 0; x < piece.matrix[y].length; x++) {
        if (!piece.matrix[y][x]) continue;
        const gy = ghostY + y;
        const gx = position.x + x;
        if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS && display[gy][gx] === EMPTY) {
          display[gy][gx] = `${piece.color}33`;
        }
      }
    }
  }

  for (let y = 0; y < piece.matrix.length; y++) {
    for (let x = 0; x < piece.matrix[y].length; x++) {
      if (!piece.matrix[y][x]) continue;
      const py = position.y + y;
      const px = position.x + x;
      if (py >= 0 && py < ROWS && px >= 0 && px < COLS) {
        display[py][px] = piece.color;
      }
    }
  }

  return display;
}

function SmallPreview({ piece, cellSize = 14 }) {
  const rows = piece?.matrix?.length || 2;
  const cols = piece?.matrix?.[0]?.length || 2;
  const gridRows = Math.max(rows, 4);
  const gridCols = Math.max(cols, 4);

  return (
    <div
      className="rounded-2xl p-3"
      style={{ background: THEME.panel, border: `1px solid ${THEME.border}` }}
    >
      <div className="mb-2 text-sm font-semibold" style={{ color: THEME.subtext }}>
        下一块
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${gridCols}, ${cellSize}px)`,
          gap: 4,
          justifyContent: "center",
          minHeight: gridRows * (cellSize + 4),
        }}
      >
        {Array.from({ length: gridRows }).flatMap((_, y) =>
          Array.from({ length: gridCols }).map((__, x) => {
            const filled = piece?.matrix?.[y]?.[x];
            return (
              <div
                key={`${y}-${x}`}
                style={{
                  width: cellSize,
                  height: cellSize,
                  borderRadius: 4,
                  background: filled ? piece.color : "#f1ede5",
                  border: `1px solid ${THEME.grid}`,
                }}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

function ActionButton({ label, onTap, onHoldStart, onHoldEnd, wide = false, secondary = false }) {
  const touchStartedRef = useRef(false);

  return (
    <button
      type="button"
      className={`select-none rounded-3xl px-4 py-4 text-lg font-semibold active:scale-[0.98] ${
        wide ? "col-span-2" : ""
      }`}
      style={{
        background: secondary ? "#f3efe7" : "#e8f0e6",
        color: THEME.text,
        border: `1px solid ${secondary ? "#ddd5c8" : "#cadac5"}`,
        boxShadow: "0 6px 16px rgba(80, 74, 60, 0.06)",
        minHeight: 62,
        touchAction: "manipulation",
      }}
      onTouchStart={(e) => {
        e.preventDefault();
        touchStartedRef.current = true;
        if (onHoldStart) {
          onHoldStart();
        } else {
          onTap?.();
        }
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        if (onHoldEnd) onHoldEnd();
        setTimeout(() => {
          touchStartedRef.current = false;
        }, 0);
      }}
      onMouseDown={() => {
        if (onHoldStart) onHoldStart();
      }}
      onMouseUp={() => {
        if (onHoldEnd) onHoldEnd();
      }}
      onMouseLeave={() => {
        if (onHoldEnd) onHoldEnd();
      }}
      onClick={(e) => {
        if (touchStartedRef.current) return;
        e.preventDefault();
        if (!onHoldStart) onTap?.();
      }}
    >
      {label}
    </button>
  );
}

export default function App() {
  const [board, setBoard] = useState(() => createBoard());
  const [currentPiece, setCurrentPiece] = useState(() => randomPiece());
  const [nextPiece, setNextPiece] = useState(() => randomPiece());
  const [position, setPosition] = useState(() => getStartPosition(randomPiece().matrix));

  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);

  const [status, setStatus] = useState("准备开始");
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState("relax");

  const [highScore, setHighScore] = useState(() => {
    if (typeof window === "undefined") return 0;
    const saved = window.localStorage.getItem("friendly-tetris-high-score");
    return saved ? Number(saved) : 0;
  });

  const [cellSize, setCellSize] = useState(24);

  const holdRef = useRef(null);
  const dropTimerRef = useRef(null);

  useEffect(() => {
    const updateCellSize = () => {
      const width = window.innerWidth;
      if (width <= 360) {
        setCellSize(22);
      } else if (width <= 430) {
        setCellSize(24);
      } else {
        setCellSize(26);
      }
    };

    updateCellSize();
    window.addEventListener("resize", updateCellSize);
    return () => window.removeEventListener("resize", updateCellSize);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (score > highScore) {
      setHighScore(score);
      window.localStorage.setItem("friendly-tetris-high-score", String(score));
    }
  }, [score, highScore]);

  const announce = useCallback((text) => {
    setStatus(text);
  }, []);

  const resetGame = useCallback(() => {
    const first = randomPiece();
    const second = randomPiece();

    setBoard(createBoard());
    setCurrentPiece(first);
    setNextPiece(second);
    setPosition(getStartPosition(first.matrix));

    setScore(0);
    setLines(0);
    setLevel(1);
    setStatus("准备开始");
    setGameOver(false);
    setPaused(false);
    setStarted(false);
  }, []);

  useEffect(() => {
    resetGame();
  }, [mode, resetGame]);

  const spawnNext = useCallback(
    (updatedBoard, updatedScore, updatedLines) => {
      const incoming = {
        ...nextPiece,
        matrix: cloneMatrix(nextPiece.matrix),
      };
      const freshNext = randomPiece();
      const startPos = getStartPosition(incoming.matrix);

      setBoard(updatedBoard);
      setCurrentPiece(incoming);
      setNextPiece(freshNext);
      setPosition(startPos);
      setScore(updatedScore);
      setLines(updatedLines);

      const nextLevel = Math.max(1, Math.floor(updatedLines / 8) + 1);
      setLevel(nextLevel);

      if (!isValidMove(updatedBoard, incoming, startPos)) {
        setGameOver(true);
        setStarted(false);
        announce("游戏结束");
      }
    },
    [announce, nextPiece]
  );

  const lockPiece = useCallback(
    (lockPosition = position) => {
      const merged = mergePiece(board, currentPiece, lockPosition);
      const { board: cleaned, lines: cleared } = clearLines(merged);

      const gained =
        cleared === 0 ? 0 : [0, 100, 250, 450, 700][cleared] || cleared * 200;

      const updatedScore = score + gained;
      const updatedLines = lines + cleared;

      if (cleared === 1) announce("消除 1 行");
      else if (cleared === 2) announce("连续消除 2 行");
      else if (cleared >= 3) announce(`一次消除 ${cleared} 行`);
      else announce("继续");

      spawnNext(cleaned, updatedScore, updatedLines);
    },
    [announce, board, currentPiece, lines, position, score, spawnNext]
  );

  const move = useCallback(
    (dx) => {
      if (!started || paused || gameOver) return;
      const nextPos = { ...position, x: position.x + dx };
      if (isValidMove(board, currentPiece, nextPos)) {
        setPosition(nextPos);
      }
    },
    [board, currentPiece, gameOver, paused, position, started]
  );

  const softDrop = useCallback(() => {
    if (!started || paused || gameOver) return;
    const nextPos = { ...position, y: position.y + 1 };
    if (isValidMove(board, currentPiece, nextPos)) {
      setPosition(nextPos);
    } else {
      lockPiece(position);
    }
  }, [board, currentPiece, gameOver, lockPiece, paused, position, started]);

  const hardDrop = useCallback(() => {
    if (!started || paused || gameOver) return;

    let y = position.y;
    while (isValidMove(board, currentPiece, { x: position.x, y: y + 1 })) {
      y += 1;
    }

    const finalPosition = { ...position, y };
    setPosition(finalPosition);
    lockPiece(finalPosition);
  }, [board, currentPiece, gameOver, lockPiece, paused, position, started]);

  const rotate = useCallback(() => {
    if (!started || paused || gameOver) return;

    const rotated = rotateMatrix(currentPiece.matrix);
    const candidates = [0, -1, 1, -2, 2];

    for (const offset of candidates) {
      const testPos = { x: position.x + offset, y: position.y };
      const testPiece = { ...currentPiece, matrix: rotated };
      if (isValidMove(board, testPiece, testPos)) {
        setCurrentPiece(testPiece);
        setPosition(testPos);
        return;
      }
    }
  }, [board, currentPiece, gameOver, paused, position, started]);

  const startGame = useCallback(() => {
    setStarted(true);
    setPaused(false);
    announce("开始游戏");
  }, [announce]);

  useEffect(() => {
    if (!started || paused || gameOver) return;

    const config = MODE_CONFIG[mode];
    let speed = config.speed;

    if (config.autoAccelerate) {
      speed = Math.max(220, config.speed - (level - 1) * 40);
    }

    dropTimerRef.current = setInterval(() => {
      setPosition((prev) => {
        const nextPos = { ...prev, y: prev.y + 1 };

        if (isValidMove(board, currentPiece, nextPos)) {
          return nextPos;
        }

        setTimeout(() => {
          lockPiece(prev);
        }, 0);

        return prev;
      });
    }, speed);

    return () => clearInterval(dropTimerRef.current);
  }, [board, currentPiece, gameOver, level, lockPiece, mode, paused, started]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " "].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === "ArrowLeft") move(-1);
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowDown") softDrop();
      if (e.key === "ArrowUp") rotate();
      if (e.key === " ") hardDrop();
      if (e.key.toLowerCase() === "p") setPaused((v) => !v);
    };

    window.addEventListener("keydown", onKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hardDrop, move, rotate, softDrop]);

  const holdRepeat = useCallback((action) => {
    action();
    holdRef.current = setInterval(action, 140);
  }, []);

  const clearHold = useCallback(() => {
    if (holdRef.current) {
      clearInterval(holdRef.current);
      holdRef.current = null;
    }
  }, []);

  useEffect(() => clearHold, [clearHold]);

  const displayBoard = useMemo(() => {
    return getDisplayBoard(board, currentPiece, position, true);
  }, [board, currentPiece, position]);

  const boardWidth = COLS * cellSize;
  const previewCellSize = cellSize <= 22 ? 12 : 14;

  return (
    <div
      className="min-h-screen w-full px-2 py-3 sm:px-4"
      style={{ background: THEME.bg, color: THEME.text }}
    >
      <div className="mx-auto w-full max-w-[420px]">
        <div
          className="rounded-[24px] p-3 sm:p-4"
          style={{
            background: "linear-gradient(180deg, #fffdf9 0%, #f9f5ee 100%)",
            border: `1px solid ${THEME.border}`,
            boxShadow: THEME.shadow,
          }}
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold">护眼俄罗斯方块</h1>
              <p className="mt-1 text-sm" style={{ color: THEME.subtext }}>
                简洁、轻松、手机端友好
              </p>
            </div>
            <div
              className="rounded-2xl px-3 py-2 text-sm font-semibold"
              style={{ background: THEME.panel, border: `1px solid ${THEME.border}` }}
            >
              最高分 {highScore}
            </div>
          </div>

          <div className="mb-3 grid grid-cols-[1fr_96px] gap-2">
            <div
              className="overflow-hidden rounded-[20px] p-2"
              style={{ background: THEME.panel, border: `1px solid ${THEME.border}` }}
            >
              <div
                className="mx-auto grid"
                style={{
                  width: boardWidth,
                  maxWidth: "100%",
                  gridTemplateColumns: `repeat(${COLS}, ${cellSize}px)`,
                  background: "#f2eee6",
                  borderRadius: 14,
                  overflow: "hidden",
                  border: `1px solid ${THEME.grid}`,
                }}
              >
                {displayBoard.flatMap((row, y) =>
                  row.map((cell, x) => (
                    <div
                      key={`${y}-${x}`}
                      style={{
                        width: cellSize,
                        height: cellSize,
                        background: cell || "#fbf8f1",
                        borderRight: x === COLS - 1 ? "none" : `1px solid ${THEME.grid}`,
                        borderBottom: y === ROWS - 1 ? "none" : `1px solid ${THEME.grid}`,
                        boxSizing: "border-box",
                      }}
                    />
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <SmallPreview piece={nextPiece} cellSize={previewCellSize} />
              <div
                className="rounded-2xl p-3 text-sm"
                style={{ background: THEME.panel, border: `1px solid ${THEME.border}` }}
              >
                <div className="font-semibold" style={{ color: THEME.subtext }}>
                  分数
                </div>
                <div className="mt-1 text-2xl font-bold">{score}</div>

                <div className="mt-3 font-semibold" style={{ color: THEME.subtext }}>
                  消行
                </div>
                <div className="mt-1 text-2xl font-bold">{lines}</div>
              </div>
            </div>
          </div>

          <div
            className="mb-3 rounded-2xl p-3 text-sm font-medium"
            style={{ background: "#f7f1e8", border: `1px solid ${THEME.border}` }}
          >
            {gameOver ? "本局结束" : paused ? "游戏已暂停" : status}
          </div>

          <div className="mb-3 grid grid-cols-3 gap-2">
            {Object.entries(MODE_CONFIG).map(([key, value]) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                className="rounded-2xl px-2 py-3 text-sm font-semibold"
                style={{
                  background: mode === key ? "#e8f0e6" : THEME.panel,
                  border: `1px solid ${mode === key ? "#c8d7c2" : THEME.border}`,
                }}
              >
                {value.label}
              </button>
            ))}
          </div>

          <div className="mb-3 grid grid-cols-2 gap-3">
            <ActionButton
              label="左移"
              onHoldStart={() => holdRepeat(() => move(-1))}
              onHoldEnd={clearHold}
            />
            <ActionButton
              label="右移"
              onHoldStart={() => holdRepeat(() => move(1))}
              onHoldEnd={clearHold}
            />
            <ActionButton label="旋转" onTap={rotate} />
            <ActionButton label="直落" onTap={hardDrop} secondary />
            <ActionButton label="慢下" onTap={softDrop} />
            <ActionButton
              label={paused ? "继续" : "暂停"}
              onTap={() => setPaused((v) => !v)}
              secondary
            />
            <ActionButton
              label={started ? "重新开始" : "开始游戏"}
              onTap={started ? resetGame : startGame}
              wide
            />
          </div>

          <div
            className="rounded-2xl p-3 text-sm leading-6"
            style={{
              background: THEME.panel,
              border: `1px solid ${THEME.border}`,
              color: THEME.subtext,
            }}
          >
            点击移动，长按可连续左右移动。点击“直落”可直接到底。
          </div>
        </div>
      </div>
    </div>
  );
}