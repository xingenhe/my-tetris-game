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
  primary: "#e8f0e6",
  secondary: "#f3efe7",
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

function Button({
  label,
  onTap,
  onHoldStart,
  onHoldEnd,
  secondary = false,
  wide = false,
  minHeight = 54,
  fontSize = 17,
}) {
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
        minHeight,
        borderRadius: 18,
        border: `1px solid ${secondary ? "#ddd5c8" : "#cadac5"}`,
        background: secondary ? THEME.secondary : THEME.primary,
        color: THEME.text,
        fontSize,
        fontWeight: 700,
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
  const [level, setLevel] = useState(1);

  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState("relax");
  const [showModeMenu, setShowModeMenu] = useState(false);

  const [cellSize, setCellSize] = useState(22);

  const wrapRef = useRef(null);
  const holdRef = useRef(null);
  const dropTimerRef = useRef(null);

  useEffect(() => {
    const updateCellSize = () => {
      if (!wrapRef.current) return;

      const viewportWidth = window.innerWidth;
      const containerWidth = wrapRef.current.clientWidth;
      const available = Math.min(containerWidth - 16, viewportWidth - 28);
      const nextSize = Math.floor(available / COLS);

      if (viewportWidth <= 360) {
        setCellSize(Math.max(16, Math.min(20, nextSize)));
      } else if (viewportWidth <= 430) {
        setCellSize(Math.max(18, Math.min(22, nextSize)));
      } else {
        setCellSize(Math.max(20, Math.min(26, nextSize)));
      }
    };

    updateCellSize();
    window.addEventListener("resize", updateCellSize);
    return () => window.removeEventListener("resize", updateCellSize);
  }, []);

  const resetGame = useCallback(() => {
    const first = randomPiece();
    const second = randomPiece();

    setBoard(createBoard());
    setCurrentPiece(first);
    setNextPiece(second);
    setPosition(getStartPosition(first.matrix));
    setScore(0);
    setLevel(1);
    setGameOver(false);
    setPaused(false);
    setStarted(false);
    setShowModeMenu(false);
  }, []);

  useEffect(() => {
    resetGame();
  }, [mode, resetGame]);

  const spawnNext = useCallback(
    (updatedBoard, updatedScore, updatedLevelBase) => {
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
      setLevel(updatedLevelBase);

      if (!isValidMove(updatedBoard, incoming, startPos)) {
        setGameOver(true);
        setStarted(false);
      }
    },
    [nextPiece]
  );

  const lockPiece = useCallback(
    (lockPosition = position) => {
      const merged = mergePiece(board, currentPiece, lockPosition);
      const { board: cleaned, lines: cleared } = clearLines(merged);
      const gained = cleared === 0 ? 0 : [0, 100, 250, 450, 700][cleared] || cleared * 200;
      const updatedScore = score + gained;
      const updatedLevel = Math.max(1, level + (cleared > 0 ? 0.125 : 0));

      spawnNext(cleaned, updatedScore, updatedLevel);
    },
    [board, currentPiece, level, position, score, spawnNext]
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

  const mainAction = useCallback(() => {
    if (gameOver) {
      resetGame();
      return;
    }

    if (!started) {
      setStarted(true);
      setPaused(false);
      return;
    }

    setPaused((prev) => !prev);
  }, [gameOver, resetGame, started]);

  const mainActionLabel = gameOver
    ? "重新开始"
    : !started
    ? "开始游戏"
    : paused
    ? "继续游戏"
    : "暂停游戏";

  useEffect(() => {
    if (!started || paused || gameOver) return;

    const config = MODE_CONFIG[mode];
    let speed = config.speed;

    if (config.autoAccelerate) {
      speed = Math.max(220, config.speed - (Math.floor(level) - 1) * 35);
    }

    dropTimerRef.current = setInterval(() => {
      setPosition((prev) => {
        const nextPos = { ...prev, y: prev.y + 1 };

        if (isValidMove(board, currentPiece, nextPos)) {
          return nextPos;
        }

        setTimeout(() => lockPiece(prev), 0);
        return prev;
      });
    }, speed);

    return () => clearInterval(dropTimerRef.current);
  }, [board, currentPiece, gameOver, level, lockPiece, mode, paused, started]);

  const holdRepeat = useCallback((action) => {
    action();
    holdRef.current = setInterval(action, 120);
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
  const boardHeight = ROWS * cellSize;

  return (
    <div
      ref={wrapRef}
      style={{
        minHeight: "100vh",
        width: "100%",
        padding: 10,
        background: THEME.bg,
        color: THEME.text,
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 430,
          margin: "0 auto",
          background: "linear-gradient(180deg, #fffdf9 0%, #f9f5ee 100%)",
          border: `1px solid ${THEME.border}`,
          borderRadius: 22,
          boxShadow: THEME.shadow,
          padding: 10,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 8,
            alignItems: "stretch",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              background: THEME.panel,
              border: `1px solid ${THEME.border}`,
              borderRadius: 16,
              padding: "10px 12px",
              minHeight: 68,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: THEME.subtext }}>分数</div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 2 }}>{score}</div>
          </div>

          <div
            style={{
              background: THEME.panel,
              border: `1px solid ${THEME.border}`,
              borderRadius: 16,
              padding: 10,
              minWidth: 88,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: THEME.subtext,
                textAlign: "center",
              }}
            >
              下一块
            </div>
            <div
              style={{
                marginTop: 6,
                display: "grid",
                gridTemplateColumns: "repeat(4, 14px)",
                gap: 3,
                justifyContent: "center",
              }}
            >
              {Array.from({ length: 4 }).flatMap((_, y) =>
                Array.from({ length: 4 }).map((__, x) => {
                  const filled = nextPiece?.matrix?.[y]?.[x];
                  return (
                    <div
                      key={`${y}-${x}`}
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 3,
                        background: filled ? nextPiece.color : "#f1ede5",
                        border: `1px solid ${THEME.grid}`,
                      }}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            background: THEME.panel,
            border: `1px solid ${THEME.border}`,
            borderRadius: 18,
            padding: 6,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              width: boardWidth,
              height: boardHeight,
              maxWidth: "100%",
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: `repeat(${COLS}, ${cellSize}px)`,
              background: "#f2eee6",
              borderRadius: 12,
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

        <div style={{ marginBottom: 8 }}>
          <button
            type="button"
            onClick={() => setShowModeMenu((v) => !v)}
            style={{
              width: "100%",
              minHeight: 38,
              borderRadius: 12,
              border: `1px solid ${THEME.border}`,
              background: THEME.panel,
              color: THEME.text,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            模式：{MODE_CONFIG[mode].label} {showModeMenu ? "▲" : "▼"}
          </button>

          {showModeMenu && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 8,
                marginTop: 8,
              }}
            >
              {Object.entries(MODE_CONFIG).map(([key, value]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setMode(key);
                    setShowModeMenu(false);
                  }}
                  style={{
                    minHeight: 38,
                    borderRadius: 12,
                    border: `1px solid ${mode === key ? "#c8d7c2" : THEME.border}`,
                    background: mode === key ? THEME.primary : THEME.panel,
                    fontSize: 13,
                    fontWeight: 600,
                    color: THEME.text,
                  }}
                >
                  {value.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            position: "sticky",
            bottom: 0,
            background: "linear-gradient(180deg, rgba(249,245,238,0) 0%, rgba(249,245,238,0.92) 18%, rgba(249,245,238,1) 100%)",
            paddingTop: 8,
            marginTop: 2,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <Button
              label="左移"
              onHoldStart={() => holdRepeat(() => move(-1))}
              onHoldEnd={clearHold}
              minHeight={58}
              fontSize={18}
            />
            <Button
              label="右移"
              onHoldStart={() => holdRepeat(() => move(1))}
              onHoldEnd={clearHold}
              minHeight={58}
              fontSize={18}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <Button label="旋转" onTap={rotate} minHeight={54} />
            <Button label="直落" onTap={hardDrop} secondary minHeight={54} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
            <Button label={mainActionLabel} onTap={mainAction} minHeight={60} fontSize={19} />
          </div>
        </div>
      </div>
    </div>
  );
}