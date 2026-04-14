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

function Button({ label, onTap, onHoldStart, onHoldEnd, secondary = false, wide = false }) {
  const touchStartedRef = useRef(false);

  return (
    <button
      type="button"
      onTouchStart={(e) => {
        e.preventDefault();
        touchStartedRef.current = true;
        if (onHoldStart) onHoldStart();
        else onTap?.();
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        onHoldEnd?.();
        setTimeout(() => {
          touchStartedRef.current = false;
        }, 0);
      }}
      onMouseDown={() => onHoldStart?.()}
      onMouseUp={() => onHoldEnd?.()}
      onMouseLeave={() => onHoldEnd?.()}
      onClick={(e) => {
        if (touchStartedRef.current) return;
        e.preventDefault();
        if (!onHoldStart) onTap?.();
      }}
      style={{
        width: "100%",
        minHeight: 56,
        borderRadius: 18,
        border: `1px solid ${secondary ? "#ddd5c8" : "#cadac5"}`,
        background: secondary ? "#f3efe7" : "#e8f0e6",
        color: THEME.text,
        fontSize: 18,
        fontWeight: 600,
        boxShadow: "0 6px 16px rgba(80, 74, 60, 0.06)",
        gridColumn: wide ? "span 2" : "span 1",
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

  const wrapRef = useRef(null);
  const holdRef = useRef(null);
  const dropTimerRef = useRef(null);

  useEffect(() => {
    const updateCellSize = () => {
      if (!wrapRef.current) return;
      const containerWidth = wrapRef.current.clientWidth;
      const available = Math.max(220, containerWidth - 24);
      const nextSize = Math.floor(available / COLS);
      setCellSize(Math.max(18, Math.min(28, nextSize)));
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
      setLevel(Math.max(1, Math.floor(updatedLines / 8) + 1));

      if (!isValidMove(updatedBoard, incoming, startPos)) {
        setGameOver(true);
        setStarted(false);
        announce("本局结束");
      }
    },
    [announce, nextPiece]
  );

  const lockPiece = useCallback(
    (lockPosition = position) => {
      const merged = mergePiece(board, currentPiece, lockPosition);
      const { board: cleaned, lines: cleared } = clearLines(merged);
      const gained = cleared === 0 ? 0 : [0, 100, 250, 450, 700][cleared] || cleared * 200;

      if (cleared === 1) announce("消除 1 行");
      else if (cleared === 2) announce("连续消除 2 行");
      else if (cleared >= 3) announce(`一次消除 ${cleared} 行`);
      else announce("继续");

      spawnNext(cleaned, score + gained, lines + cleared);
    },
    [announce, board, currentPiece, lines, position, score, spawnNext]
  );

  const move = useCallback(
    (dx) => {
      if (!started || paused || gameOver) return;
      const nextPos = { ...position, x: position.x + dx };
      if (isValidMove(board, currentPiece, nextPos)) setPosition(nextPos);
    },
    [board, currentPiece, gameOver, paused, position, started]
  );

  const softDrop = useCallback(() => {
    if (!started || paused || gameOver) return;
    const nextPos = { ...position, y: position.y + 1 };
    if (isValidMove(board, currentPiece, nextPos)) setPosition(nextPos);
    else lockPiece(position);
  }, [board, currentPiece, gameOver, lockPiece, paused, position, started]);

  const hardDrop = useCallback(() => {
    if (!started || paused || gameOver) return;
    let y = position.y;
    while (isValidMove(board, currentPiece, { x: position.x, y: y + 1 })) y += 1;
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
    if (config.autoAccelerate) speed = Math.max(220, config.speed - (level - 1) * 40);

    dropTimerRef.current = setInterval(() => {
      setPosition((prev) => {
        const nextPos = { ...prev, y: prev.y + 1 };
        if (isValidMove(board, currentPiece, nextPos)) return nextPos;
        setTimeout(() => lockPiece(prev), 0);
        return prev;
      });
    }, speed);

    return () => clearInterval(dropTimerRef.current);
  }, [board, currentPiece, gameOver, level, lockPiece, mode, paused, started]);

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

  return (
    <div
      ref={wrapRef}
      style={{
        minHeight: "100vh",
        width: "100%",
        padding: 12,
        background: THEME.bg,
        color: THEME.text,
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          margin: "0 auto",
          background: "linear-gradient(180deg, #fffdf9 0%, #f9f5ee 100%)",
          border: `1px solid ${THEME.border}`,
          borderRadius: 24,
          boxShadow: THEME.shadow,
          padding: 12,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>护眼俄罗斯方块</div>
          <div style={{ fontSize: 14, color: THEME.subtext, marginTop: 4 }}>简洁、轻松、手机端友好</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          <div style={{ background: THEME.panel, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: 12, textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: THEME.subtext }}>分数</div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{score}</div>
          </div>
          <div style={{ background: THEME.panel, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: 12, textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: THEME.subtext }}>最高分</div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{highScore}</div>
          </div>
        </div>

        <div style={{ background: THEME.panel, border: `1px solid ${THEME.border}`, borderRadius: 20, padding: 8, marginBottom: 12 }}>
          <div
            style={{
              width: boardWidth,
              maxWidth: "100%",
              margin: "0 auto",
              display: "grid",
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
                  }}
                />
              ))
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          <div style={{ background: THEME.panel, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: 12, textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: THEME.subtext }}>下一块</div>
            <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(4, 16px)", gap: 4, justifyContent: "center" }}>
              {Array.from({ length: 4 }).flatMap((_, y) =>
                Array.from({ length: 4 }).map((__, x) => {
                  const filled = nextPiece?.matrix?.[y]?.[x];
                  return (
                    <div
                      key={`${y}-${x}`}
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        background: filled ? nextPiece.color : "#f1ede5",
                        border: `1px solid ${THEME.grid}`,
                      }}
                    />
                  );
                })
              )}
            </div>
          </div>

          <div style={{ background: THEME.panel, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: 12, textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: THEME.subtext }}>消行 / 等级</div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>{lines}</div>
            <div style={{ fontSize: 14, color: THEME.subtext, marginTop: 8 }}>等级 {level}</div>
          </div>
        </div>

        <div style={{ background: "#f7f1e8", border: `1px solid ${THEME.border}`, borderRadius: 16, padding: 12, textAlign: "center", fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
          {gameOver ? "本局结束" : paused ? "游戏已暂停" : status}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
          {Object.entries(MODE_CONFIG).map(([key, value]) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              style={{
                minHeight: 44,
                borderRadius: 14,
                border: `1px solid ${mode === key ? "#c8d7c2" : THEME.border}`,
                background: mode === key ? "#e8f0e6" : THEME.panel,
                fontSize: 14,
                fontWeight: 600,
                color: THEME.text,
              }}
            >
              {value.label}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Button label="左移" onHoldStart={() => holdRepeat(() => move(-1))} onHoldEnd={clearHold} />
          <Button label="右移" onHoldStart={() => holdRepeat(() => move(1))} onHoldEnd={clearHold} />
          <Button label="旋转" onTap={rotate} />
          <Button label="直落" onTap={hardDrop} secondary />
          <Button label="慢下" onTap={softDrop} />
          <Button label={paused ? "继续" : "暂停"} onTap={() => setPaused((v) => !v)} secondary />
          <Button label={started ? "重新开始" : "开始游戏"} onTap={started ? resetGame : startGame} wide />
        </div>

        <div style={{ marginTop: 12, background: THEME.panel, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: 12, textAlign: "center", fontSize: 14, color: THEME.subtext }}>
          点击移动，长按可连续左右移动。
        </div>
      </div>
    </div>
  );
}