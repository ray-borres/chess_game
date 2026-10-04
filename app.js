const boardElement = document.getElementById("board");
const turnElement = document.getElementById("turn");
const sideElement = document.getElementById("side");
const statusElement = document.getElementById("status");
const movesElement = document.getElementById("moves");
const botStatusElement = document.getElementById("botStatus");
const messageElement = document.getElementById("message");
const checkMessageElement = document.getElementById("checkMessage");
const resetButton = document.getElementById("reset");

const symbols = {
    wp: "♙",
    wr: "♖",
    wn: "♘",
    wb: "♗",
    wq: "♕",
    wk: "♔",
    bp: "♟",
    br: "♜",
    bn: "♞",
    bb: "♝",
    bq: "♛",
    bk: "♚"
};

const initialBoard = [
    ["br", null, null, null, null, null, null, "bk"],
    [null, "bp", null, null, null, "wq", "bp", null],
    [null, null, null, null, null, null, null, null],
    [null, null, "wb", null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ["wp", "wp", "wp", null, null, "wp", "wp", "wp"],
    ["wr", "wn", null, null, "wk", null, "wn", "wr"]
];

const DECOY_KEYS = {
    alpha: 0x12,
    beta: 0x5A,
    gamma: 0x31,
    legacy: 0x7F,
    emergency: 0xC4
};

const KEY_PART_ONE = 0x12;
const KEY_PART_TWO = 0x35;
const KEY_PART_THREE = 0x80;

const SECRET = {
    payload:
        "YzRkZWM1YzJkNWQ0ZDJkNWMxYzJkNWU0ZjNlMWRjZjNjZjk0ZjhlYzk2YzljMGY4ZWY5M2Q0ZjhlOTk3ZjhlMmQ0YzQ5M2Q3OTRkYQ=="
};

const fakeVaults = [
    "RkFLRV9WQVVMVF9PTkU=",
    "RkFLRV9DSEVDS01BVEU=",
    "V1JPTkdfS0VZ",
    "Qk9UX1dJTlM="
];

let gameBoard = [];
let selected = null;
let currentTurn = "w";
let moveCount = 0;
let gameOver = false;
let botThinking = false;

const gameState = {
    active: true,
    checkmate: false,
    winner: null
};

function cloneBoard(board) {
    return board.map(row => [...row]);
}

function resetGame() {

    gameBoard = cloneBoard(initialBoard);

    selected = null;
    currentTurn = "w";
    moveCount = 0;
    gameOver = false;
    botThinking = false;

    gameState.active = true;
    gameState.checkmate = false;
    gameState.winner = null;

    turnElement.textContent = "WHITE";
    sideElement.textContent = "WHITE";
    statusElement.textContent = "IN PROGRESS";
    statusElement.style.color = "#38bdf8";
    movesElement.textContent = "0";

    botStatusElement.textContent = "READY";
    botStatusElement.style.color = "#38bdf8";

    messageElement.textContent =
        "Find the checkmate. If your king is checked, you must respond to the check.";

    checkMessageElement.textContent = "";

    renderBoard();
}

function renderBoard() {

    boardElement.innerHTML = "";

    const whiteInCheck = isKingInCheck("w");
    const blackInCheck = isKingInCheck("b");

    for (let row = 0; row < 8; row++) {

        for (let col = 0; col < 8; col++) {

            const square = document.createElement("div");

            square.className =
                (row + col) % 2 === 0
                    ? "square light"
                    : "square dark";

            square.dataset.row = row;
            square.dataset.col = col;

            const piece = gameBoard[row][col];

            if (piece) {

                square.textContent = symbols[piece];

                if (piece[0] === "w") {
                    square.classList.add("white-piece");
                } else {
                    square.classList.add("black-piece");
                }

                if (
                    piece === "wk" &&
                    whiteInCheck
                ) {
                    square.classList.add("king-check");
                }

                if (
                    piece === "bk" &&
                    blackInCheck
                ) {
                    square.classList.add("king-check");
                }
            }

            if (
                selected &&
                selected.row === row &&
                selected.col === col
            ) {
                square.classList.add("selected");
            }

            if (selected) {

                const legalMoves =
                    getLegalMovesFrom(
                        selected.row,
                        selected.col
                    );

                const possible =
                    legalMoves.some(move =>
                        move.toRow === row &&
                        move.toCol === col
                    );

                if (possible) {

                    if (gameBoard[row][col]) {
                        square.classList.add("capture");
                    } else {
                        square.classList.add("move");
                    }
                }
            }

            square.addEventListener(
                "click",
                handleSquareClick
            );

            boardElement.appendChild(square);
        }
    }

    if (whiteInCheck) {
        checkMessageElement.textContent =
            "CHECK! You must move, capture, or block.";
    } else if (blackInCheck) {
        checkMessageElement.textContent =
            "BLACK KING IS IN CHECK!";
    } else {
        checkMessageElement.textContent = "";
    }
}

function handleSquareClick(event) {

    if (gameOver || botThinking) {
        return;
    }

    if (currentTurn !== "w") {
        return;
    }

    const row =
        Number(event.currentTarget.dataset.row);

    const col =
        Number(event.currentTarget.dataset.col);

    const piece =
        gameBoard[row][col];

    if (!selected) {

        if (!piece) {
            return;
        }

        if (piece[0] !== "w") {

            messageElement.textContent =
                "You control the white pieces.";

            return;
        }

        const moves =
            getLegalMovesFrom(row, col);

        if (moves.length === 0) {

            if (isKingInCheck("w")) {

                messageElement.textContent =
                    "Your king is in check. This piece cannot make a legal move.";

            } else {

                messageElement.textContent =
                    "That piece has no legal moves.";
            }

            return;
        }

        selected = {
            row,
            col
        };

        messageElement.textContent =
            "Choose a legal destination.";

        renderBoard();

        return;
    }

    if (
        selected.row === row &&
        selected.col === col
    ) {

        selected = null;

        messageElement.textContent =
            "Piece deselected.";

        renderBoard();

        return;
    }

    if (
        piece &&
        piece[0] === "w"
    ) {

        selected = {
            row,
            col
        };

        renderBoard();

        return;
    }

    const legalMoves =
        getLegalMovesFrom(
            selected.row,
            selected.col
        );

    const valid =
        legalMoves.some(move =>
            move.toRow === row &&
            move.toCol === col
        );

    if (!valid) {

        messageElement.textContent =
            isKingInCheck("w")
                ? "Illegal move. Your king is still in check."
                : "Illegal chess move.";

        selected = null;

        renderBoard();

        return;
    }

    makeMove(
        selected.row,
        selected.col,
        row,
        col
    );
}

function getLegalMovesFrom(
    fromRow,
    fromCol
) {

    const piece =
        gameBoard[fromRow][fromCol];

    if (!piece) {
        return [];
    }

    const color = piece[0];

    const moves = [];

    for (let toRow = 0; toRow < 8; toRow++) {

        for (let toCol = 0; toCol < 8; toCol++) {

            if (
                isPseudoLegalMove(
                    gameBoard,
                    fromRow,
                    fromCol,
                    toRow,
                    toCol
                )
            ) {

                const testBoard =
                    cloneBoard(gameBoard);

                testBoard[toRow][toCol] =
                    testBoard[fromRow][fromCol];

                testBoard[fromRow][fromCol] =
                    null;

                if (!isKingInCheckOnBoard(testBoard, color)) {

                    moves.push({
                        fromRow,
                        fromCol,
                        toRow,
                        toCol
                    });
                }
            }
        }
    }

    return moves;
}

function getAllLegalMoves(color) {

    const moves = [];

    for (let row = 0; row < 8; row++) {

        for (let col = 0; col < 8; col++) {

            const piece =
                gameBoard[row][col];

            if (
                !piece ||
                piece[0] !== color
            ) {
                continue;
            }

            const pieceMoves =
                getLegalMovesFrom(row, col);

            moves.push(...pieceMoves);
        }
    }

    return moves;
}

function isPseudoLegalMove(
    board,
    fromRow,
    fromCol,
    toRow,
    toCol
) {

    const piece =
        board[fromRow][fromCol];

    if (!piece) {
        return false;
    }

    const target =
        board[toRow][toCol];

    if (
        target &&
        target[0] === piece[0]
    ) {
        return false;
    }

    if (
        target &&
        target[1] === "k"
    ) {
        return false;
    }

    const rowDiff =
        toRow - fromRow;

    const colDiff =
        toCol - fromCol;

    const absRow =
        Math.abs(rowDiff);

    const absCol =
        Math.abs(colDiff);

    const type =
        piece[1];

    if (type === "p") {

        const direction =
            piece[0] === "w"
                ? -1
                : 1;

        const startRow =
            piece[0] === "w"
                ? 6
                : 1;

        if (
            colDiff === 0 &&
            rowDiff === direction &&
            !target
        ) {
            return true;
        }

        if (
            colDiff === 0 &&
            rowDiff === direction * 2 &&
            fromRow === startRow &&
            !target &&
            !board[
                fromRow + direction
            ][fromCol]
        ) {
            return true;
        }

        if (
            absCol === 1 &&
            rowDiff === direction &&
            target &&
            target[0] !== piece[0]
        ) {
            return true;
        }

        return false;
    }

    if (type === "r") {

        if (
            rowDiff !== 0 &&
            colDiff !== 0
        ) {
            return false;
        }

        return pathClear(
            board,
            fromRow,
            fromCol,
            toRow,
            toCol
        );
    }

    if (type === "b") {

        if (absRow !== absCol) {
            return false;
        }

        return pathClear(
            board,
            fromRow,
            fromCol,
            toRow,
            toCol
        );
    }

    if (type === "q") {

        if (
            rowDiff !== 0 &&
            colDiff !== 0 &&
            absRow !== absCol
        ) {
            return false;
        }

        return pathClear(
            board,
            fromRow,
            fromCol,
            toRow,
            toCol
        );
    }

    if (type === "n") {

        return (
            (absRow === 2 && absCol === 1) ||
            (absRow === 1 && absCol === 2)
        );
    }

    if (type === "k") {

        return (
            absRow <= 1 &&
            absCol <= 1
        );
    }

    return false;
}

function pathClear(
    board,
    fromRow,
    fromCol,
    toRow,
    toCol
) {

    const rowStep =
        Math.sign(toRow - fromRow);

    const colStep =
        Math.sign(toCol - fromCol);

    let row =
        fromRow + rowStep;

    let col =
        fromCol + colStep;

    while (
        row !== toRow ||
        col !== toCol
    ) {

        if (board[row][col]) {
            return false;
        }

        row += rowStep;
        col += colStep;
    }

    return true;
}

function findKing(board, color) {

    const king =
        color === "w"
            ? "wk"
            : "bk";

    for (let row = 0; row < 8; row++) {

        for (let col = 0; col < 8; col++) {

            if (board[row][col] === king) {

                return {
                    row,
                    col
                };
            }
        }
    }

    return null;
}

function isSquareAttacked(
    board,
    row,
    col,
    attackerColor
) {

    for (let fromRow = 0; fromRow < 8; fromRow++) {

        for (let fromCol = 0; fromCol < 8; fromCol++) {

            const piece =
                board[fromRow][fromCol];

            if (
                !piece ||
                piece[0] !== attackerColor
            ) {
                continue;
            }

            if (
                attacksSquare(
                    board,
                    fromRow,
                    fromCol,
                    row,
                    col
                )
            ) {
                return true;
            }
        }
    }

    return false;
}

function attacksSquare(
    board,
    fromRow,
    fromCol,
    toRow,
    toCol
) {

    const piece =
        board[fromRow][fromCol];

    const rowDiff =
        toRow - fromRow;

    const colDiff =
        toCol - fromCol;

    const absRow =
        Math.abs(rowDiff);

    const absCol =
        Math.abs(colDiff);

    const type =
        piece[1];

    if (type === "p") {

        const direction =
            piece[0] === "w"
                ? -1
                : 1;

        return (
            rowDiff === direction &&
            absCol === 1
        );
    }

    if (type === "n") {

        return (
            (absRow === 2 && absCol === 1) ||
            (absRow === 1 && absCol === 2)
        );
    }

    if (type === "k") {

        return (
            absRow <= 1 &&
            absCol <= 1 &&
            !(absRow === 0 && absCol === 0)
        );
    }

    if (type === "r") {

        if (
            rowDiff !== 0 &&
            colDiff !== 0
        ) {
            return false;
        }

        return pathClear(
            board,
            fromRow,
            fromCol,
            toRow,
            toCol
        );
    }

    if (type === "b") {

        if (absRow !== absCol) {
            return false;
        }

        return pathClear(
            board,
            fromRow,
            fromCol,
            toRow,
            toCol
        );
    }

    if (type === "q") {

        if (
            rowDiff !== 0 &&
            colDiff !== 0 &&
            absRow !== absCol
        ) {
            return false;
        }

        return pathClear(
            board,
            fromRow,
            fromCol,
            toRow,
            toCol
        );
    }

    return false;
}

function isKingInCheckOnBoard(
    board,
    color
) {

    const king =
        findKing(board, color);

    if (!king) {
        return true;
    }

    const enemy =
        color === "w"
            ? "b"
            : "w";

    return isSquareAttacked(
        board,
        king.row,
        king.col,
        enemy
    );
}

function isKingInCheck(color) {

    return isKingInCheckOnBoard(
        gameBoard,
        color
    );
}

function makeMove(
    fromRow,
    fromCol,
    toRow,
    toCol
) {

    const piece =
        gameBoard[fromRow][fromCol];

    gameBoard[toRow][toCol] =
        piece;

    gameBoard[fromRow][fromCol] =
        null;

    promotePawn(toRow, toCol);

    selected = null;

    moveCount++;

    movesElement.textContent =
        moveCount;

    const opponent =
        piece[0] === "w"
            ? "b"
            : "w";

    const opponentInCheck =
        isKingInCheck(opponent);

    const opponentMoves =
        getAllLegalMoves(opponent);

    if (
        opponentInCheck &&
        opponentMoves.length === 0
    ) {

        if (opponent === "b") {
            finishGame("white");
        } else {
            finishGame("black");
        }

        return;
    }

    if (
        !opponentInCheck &&
        opponentMoves.length === 0
    ) {

        finishDraw();

        return;
    }

    currentTurn = opponent;

    turnElement.textContent =
        opponent === "w"
            ? "WHITE"
            : "BLACK";

    sideElement.textContent =
        opponent === "w"
            ? "WHITE"
            : "BLACK";

    renderBoard();

    if (opponent === "b") {

        messageElement.textContent =
            opponentInCheck
                ? "CHECK! The black king must move, capture, or block."
                : "The black bot is thinking...";

        botThinking = true;

        botStatusElement.textContent =
            "THINKING";

        setTimeout(
            botMove,
            800
        );

    } else {

        messageElement.textContent =
            opponentInCheck
                ? "CHECK! You must move, capture, or block the attack."
                : "Your turn.";
    }
}

function botMove() {

    if (gameOver) {
        return;
    }

    const moves =
        getAllLegalMoves("b");

    if (moves.length === 0) {

        if (isKingInCheck("b")) {
            finishGame("white");
        } else {
            finishDraw();
        }

        return;
    }

    const captures =
        moves.filter(move =>
            gameBoard[
                move.toRow
            ][
                move.toCol
            ]
        );

    let choices =
        captures.length > 0
            ? captures
            : moves;

    const nonPuzzleMoves =
        choices.filter(move => {

            const movingPiece =
                gameBoard[
                    move.fromRow
                ][
                    move.fromCol
                ];

            if (
                movingPiece === "bp" &&
                move.fromRow === 1 &&
                move.fromCol === 6
            ) {
                return false;
            }

            return true;
        });

    if (nonPuzzleMoves.length > 0) {
        choices = nonPuzzleMoves;
    }

    const selectedMove =
        choices[
            Math.floor(
                Math.random() * choices.length
            )
        ];

    const movingPiece =
        gameBoard[
            selectedMove.fromRow
        ][
            selectedMove.fromCol
        ];

    gameBoard[
        selectedMove.toRow
    ][
        selectedMove.toCol
    ] = movingPiece;

    gameBoard[
        selectedMove.fromRow
    ][
        selectedMove.fromCol
    ] = null;

    promotePawn(
        selectedMove.toRow,
        selectedMove.toCol
    );

    moveCount++;

    movesElement.textContent =
        moveCount;

    botThinking = false;

    botStatusElement.textContent =
        "READY";

    botStatusElement.style.color =
        "#38bdf8";

    currentTurn = "w";

    turnElement.textContent =
        "WHITE";

    sideElement.textContent =
        "WHITE";

    const whiteInCheck =
        isKingInCheck("w");

    if (whiteInCheck) {

        messageElement.textContent =
            "CHECK! Move the king, capture the attacker, or block the attack.";

    } else {

        messageElement.textContent =
            "Your turn. Find the checkmate.";
    }

    renderBoard();
}

function promotePawn(row, col) {

    const piece =
        gameBoard[row][col];

    if (!piece) {
        return;
    }

    if (
        piece === "wp" &&
        row === 0
    ) {
        gameBoard[row][col] = "wq";
    }

    if (
        piece === "bp" &&
        row === 7
    ) {
        gameBoard[row][col] = "bq";
    }
}

function finishGame(winner) {

    gameOver = true;

    gameState.active = false;
    gameState.checkmate = true;
    gameState.winner = winner;

    botThinking = false;

    if (winner === "white") {

        statusElement.textContent =
            "CHECKMATE";

        statusElement.style.color =
            "#4ade80";

        messageElement.textContent =
            "CHECKMATE! You defeated the black king.";

        botStatusElement.textContent =
            "DEFEATED";

        botStatusElement.style.color =
            "#4ade80";

        unlock();

    } else {

        statusElement.textContent =
            "DEFEATED";

        statusElement.style.color =
            "#ef4444";

        messageElement.textContent =
            "Checkmate. The bot defeated you.";

        botStatusElement.textContent =
            "WINNER";

        botStatusElement.style.color =
            "#ef4444";
    }

    renderBoard();
}

function finishDraw() {

    gameOver = true;

    gameState.active = false;
    gameState.checkmate = false;
    gameState.winner = null;

    statusElement.textContent =
        "DRAW";

    statusElement.style.color =
        "#facc15";

    messageElement.textContent =
        "Stalemate. Neither side can make a legal move.";

    renderBoard();
}

function unlock() {

    if (
        !gameState.checkmate ||
        gameState.winner !== "white"
    ) {
        return;
    }

    const fragments = [
        KEY_PART_ONE,
        KEY_PART_TWO,
        KEY_PART_THREE
    ];

    const XOR_KEY =
        fragments[0] ^
        fragments[1] ^
        fragments[2];

    const hexString =
        atob(SECRET.payload);

    let decoded = "";

    for (
        let i = 0;
        i < hexString.length;
        i += 2
    ) {

        const byte =
            parseInt(
                hexString.substring(i, i + 2),
                16
            );

        decoded += String.fromCharCode(
            byte ^ XOR_KEY
        );
    }

    console.log(
        "%cCHECKMATE COMPLETE",
        "font-size:20px;font-weight:bold"
    );

    console.log(
        "XOR KEY:",
        "0x" + XOR_KEY.toString(16).toUpperCase()
    );

    console.log(
        "HEX:",
        hexString
    );

    console.log(
        "FLAG:",
        decoded
    );
}

resetButton.addEventListener(
    "click",
    resetGame
);

resetGame();