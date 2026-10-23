package app.cubic;

import android.app.Activity;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.ScaleGestureDetector;
import android.view.View;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Random;

public final class MainActivity extends Activity {
    private static final int BG = Color.rgb(14, 20, 33);
    private static final int PANEL = Color.rgb(23, 32, 49);
    private static final int PANEL_ALT = Color.rgb(31, 43, 63);
    private static final int TEXT = Color.rgb(239, 244, 255);
    private static final int MUTED = Color.rgb(156, 174, 201);
    private static final int ACCENT = Color.rgb(111, 156, 255);
    private static final int STICKER_BLACK = Color.rgb(24, 30, 42);

    private static final int PX = 0;
    private static final int NX = 1;
    private static final int PY = 2;
    private static final int NY = 3;
    private static final int PZ = 4;
    private static final int NZ = 5;

    private Spinner sizeX;
    private Spinner sizeY;
    private Spinner sizeZ;
    private Spinner axisSpinner;
    private Spinner layerSpinner;
    private TextView statusView;
    private PuzzleView puzzleView;
    private Puzzle puzzle;
    private final ArrayList<Move> history = new ArrayList<>();
    private final Random random = new Random();

    private Button positiveButton;
    private Button negativeButton;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (Build.VERSION.SDK_INT >= 21) {
            getWindow().setStatusBarColor(BG);
            getWindow().setNavigationBarColor(BG);
        }
        puzzle = new Puzzle(3, 3, 3);
        createUi();
    }

    private void createUi() {
        ScrollView scroller = new ScrollView(this);
        scroller.setFillViewport(true);
        scroller.setBackgroundColor(BG);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(12), dp(9), dp(12), dp(10));
        root.setBackgroundColor(BG);
        scroller.addView(root, new ScrollView.LayoutParams(
                ScrollView.LayoutParams.MATCH_PARENT, ScrollView.LayoutParams.MATCH_PARENT));

        TextView title = text("CUBIC", 25, TEXT, true);
        title.setLetterSpacing(0.14f);
        root.addView(title, matchWrap());
        TextView subtitle = text("Twisty puzzles · cubes and cuboids", 12, MUTED, false);
        LinearLayout.LayoutParams subtitleLp = matchWrap();
        subtitleLp.bottomMargin = dp(10);
        root.addView(subtitle, subtitleLp);

        LinearLayout dimensionsRow = row(root);
        addLabel(dimensionsRow, "X");
        sizeX = sizeSpinner(3);
        addWeighted(dimensionsRow, sizeX, 1f, 38);
        addLabel(dimensionsRow, "Y");
        sizeY = sizeSpinner(3);
        addWeighted(dimensionsRow, sizeY, 1f, 38);
        addLabel(dimensionsRow, "Z");
        sizeZ = sizeSpinner(3);
        addWeighted(dimensionsRow, sizeZ, 1f, 38);

        Button buildButton = button("Build puzzle", ACCENT, BG);
        LinearLayout.LayoutParams buildLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(40));
        buildLp.topMargin = dp(6);
        buildLp.bottomMargin = dp(7);
        root.addView(buildButton, buildLp);
        buildButton.setOnClickListener(v -> buildPuzzleFromControls());

        statusView = text("Ready · 3 × 3 × 3", 12, MUTED, false);
        statusView.setGravity(Gravity.CENTER_VERTICAL);
        statusView.setPadding(dp(4), 0, dp(4), 0);
        root.addView(statusView, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(25)));

        puzzleView = new PuzzleView(this);
        puzzleView.setPuzzle(puzzle);
        LinearLayout.LayoutParams puzzleLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f);
        puzzleLp.topMargin = dp(2);
        puzzleLp.bottomMargin = dp(6);
        root.addView(puzzleView, puzzleLp);

        LinearLayout sliceRow = row(root);
        TextView sliceLabel = text("Slice", 12, MUTED, true);
        addFixed(sliceRow, sliceLabel, 44, 40);
        axisSpinner = spinner(new String[]{"X axis", "Y axis", "Z axis"});
        addWeighted(sliceRow, axisSpinner, 1f, 40);
        layerSpinner = spinner(new String[]{"1"});
        LinearLayout.LayoutParams layerLp = new LinearLayout.LayoutParams(0, dp(40), 0.8f);
        layerLp.leftMargin = dp(5);
        sliceRow.addView(layerSpinner, layerLp);
        axisSpinner.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                refreshLayerSpinner();
                updateTurnButtons();
            }
            @Override public void onNothingSelected(AdapterView<?> parent) { }
        });
        refreshLayerSpinner();

        LinearLayout turnRow = row(root);
        positiveButton = button("+90°", PANEL_ALT, TEXT);
        negativeButton = button("−90°", PANEL_ALT, TEXT);
        Button halfButton = button("180°", PANEL_ALT, TEXT);
        addWeighted(turnRow, positiveButton, 1f, 42);
        addWeighted(turnRow, negativeButton, 1f, 42);
        addWeighted(turnRow, halfButton, 1f, 42);
        positiveButton.setOnClickListener(v -> performTurn(1));
        negativeButton.setOnClickListener(v -> performTurn(-1));
        halfButton.setOnClickListener(v -> performTurn(2));

        LinearLayout utilityRow = row(root);
        Button scrambleButton = button("Scramble", PANEL, TEXT);
        Button undoButton = button("Undo", PANEL, TEXT);
        addWeighted(utilityRow, scrambleButton, 1f, 42);
        addWeighted(utilityRow, undoButton, 1f, 42);
        scrambleButton.setOnClickListener(v -> scramble());
        undoButton.setOnClickListener(v -> undo());

        LinearLayout finalRow = row(root);
        Button solveButton = button("Guided solve", ACCENT, BG);
        Button resetButton = button("Reset", PANEL, TEXT);
        addWeighted(finalRow, solveButton, 1.2f, 42);
        addWeighted(finalRow, resetButton, 0.8f, 42);
        solveButton.setOnClickListener(v -> guidedSolve());
        resetButton.setOnClickListener(v -> resetPuzzle());

        TextView gestureHint = text("Drag the puzzle to orbit · pinch to zoom", 11, MUTED, false);
        gestureHint.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams hintLp = matchWrap();
        hintLp.topMargin = dp(5);
        root.addView(gestureHint, hintLp);

        setContentView(scroller);
        updateTurnButtons();
    }

    private void buildPuzzleFromControls() {
        int x = selectedSize(sizeX);
        int y = selectedSize(sizeY);
        int z = selectedSize(sizeZ);
        puzzle = new Puzzle(x, y, z);
        history.clear();
        puzzleView.setPuzzle(puzzle);
        refreshLayerSpinner();
        updateTurnButtons();
        setStatus("New puzzle · " + x + " × " + y + " × " + z);
    }

    private int selectedSize(Spinner spinner) {
        try {
            return Integer.parseInt(String.valueOf(spinner.getSelectedItem()));
        } catch (Exception ignored) {
            return 3;
        }
    }

    private void refreshLayerSpinner() {
        if (layerSpinner == null || axisSpinner == null) return;
        int axis = Math.max(0, axisSpinner.getSelectedItemPosition());
        int count = puzzle.layerCount(axis);
        String[] layers = new String[count];
        for (int i = 0; i < count; i++) layers[i] = "Slice " + (i + 1);
        int old = layerSpinner.getSelectedItemPosition();
        ArrayAdapter<String> adapter = new ArrayAdapter<>(
                this, android.R.layout.simple_spinner_item, layers);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        layerSpinner.setAdapter(adapter);
        layerSpinner.setSelection(Math.min(Math.max(0, old), count - 1));
    }

    private void updateTurnButtons() {
        if (positiveButton == null || negativeButton == null || axisSpinner == null) return;
        int axis = Math.max(0, axisSpinner.getSelectedItemPosition());
        boolean allowed = puzzle.canQuarterTurn(axis);
        positiveButton.setEnabled(allowed);
        negativeButton.setEnabled(allowed);
        positiveButton.setAlpha(allowed ? 1f : 0.42f);
        negativeButton.setAlpha(allowed ? 1f : 0.42f);
    }

    private void performTurn(int turns) {
        int axis = axisSpinner == null ? 2 : Math.max(0, axisSpinner.getSelectedItemPosition());
        int layer = layerSpinner == null ? 0 : Math.max(0, layerSpinner.getSelectedItemPosition());
        if (turns != 2 && !puzzle.canQuarterTurn(axis)) {
            Toast.makeText(this, "This cuboid slice only supports 180° turns.", Toast.LENGTH_SHORT).show();
            return;
        }
        Move move = new Move(axis, layer, turns);
        puzzle.turn(move.axis, move.layer, move.turns);
        history.add(move);
        puzzleView.invalidate();
        setStatus(axisName(axis) + " slice " + (layer + 1) + " turned · " + history.size() + " moves recorded");
    }

    private void scramble() {
        int amount = 20;
        for (int i = 0; i < amount; i++) {
            int axis = random.nextInt(3);
            int layer = random.nextInt(puzzle.layerCount(axis));
            int turns;
            if (puzzle.canQuarterTurn(axis)) {
                int[] options = {1, -1, 2};
                turns = options[random.nextInt(options.length)];
            } else {
                turns = 2;
            }
            Move move = new Move(axis, layer, turns);
            puzzle.turn(move.axis, move.layer, move.turns);
            history.add(move);
        }
        puzzleView.invalidate();
        setStatus("Scrambled with " + amount + " moves · " + history.size() + " moves recorded");
    }

    private void undo() {
        if (history.isEmpty()) {
            setStatus("Nothing to undo");
            return;
        }
        Move last = history.remove(history.size() - 1);
        puzzle.turn(last.axis, last.layer, inverse(last.turns));
        puzzleView.invalidate();
        setStatus("Move undone · " + history.size() + " moves recorded");
    }

    private void guidedSolve() {
        if (history.isEmpty()) {
            setStatus("Already at the starting state");
            return;
        }
        for (int i = history.size() - 1; i >= 0; i--) {
            Move move = history.get(i);
            puzzle.turn(move.axis, move.layer, inverse(move.turns));
        }
        history.clear();
        puzzleView.invalidate();
        setStatus("Guided solve complete · returned to the starting state");
    }

    private void resetPuzzle() {
        int x = puzzle.nx;
        int y = puzzle.ny;
        int z = puzzle.nz;
        puzzle = new Puzzle(x, y, z);
        history.clear();
        puzzleView.setPuzzle(puzzle);
        refreshLayerSpinner();
        updateTurnButtons();
        setStatus("Reset · " + x + " × " + y + " × " + z);
    }

    private static int inverse(int turns) {
        if (turns == 2) return 2;
        return -turns;
    }

    private void setStatus(String message) {
        if (statusView != null) statusView.setText(message);
    }

    private static String axisName(int axis) {
        return axis == 0 ? "X" : axis == 1 ? "Y" : "Z";
    }

    private Spinner sizeSpinner(int selected) {
        String[] values = new String[8];
        for (int i = 0; i < values.length; i++) values[i] = String.valueOf(i + 2);
        Spinner spinner = spinner(values);
        spinner.setSelection(Math.max(0, Math.min(7, selected - 2)));
        return spinner;
    }

    private Spinner spinner(String[] values) {
        Spinner spinner = new Spinner(this);
        ArrayAdapter<String> adapter = new ArrayAdapter<>(
                this, android.R.layout.simple_spinner_item, values);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinner.setAdapter(adapter);
        spinner.setBackground(makeBackground(PANEL_ALT, 10, Color.rgb(58, 75, 103)));
        spinner.setPadding(dp(5), 0, dp(4), 0);
        return spinner;
    }

    private void addLabel(LinearLayout parent, String value) {
        TextView label = text(value, 12, MUTED, true);
        label.setGravity(Gravity.CENTER);
        addFixed(parent, label, 17, 38);
    }

    private void addFixed(LinearLayout parent, View view, int widthDp, int heightDp) {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(dp(widthDp), dp(heightDp));
        lp.rightMargin = dp(4);
        parent.addView(view, lp);
    }

    private void addWeighted(LinearLayout parent, View view, float weight, int heightDp) {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, dp(heightDp), weight);
        lp.leftMargin = dp(3);
        lp.rightMargin = dp(3);
        parent.addView(view, lp);
    }

    private LinearLayout row(LinearLayout parent) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.topMargin = dp(3);
        lp.bottomMargin = dp(3);
        parent.addView(row, lp);
        return row;
    }

    private TextView text(String value, float size, int color, boolean bold) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        if (bold) view.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return view;
    }

    private Button button(String label, int fill, int textColor) {
        Button button = new Button(this);
        button.setText(label);
        button.setTextSize(12);
        button.setAllCaps(false);
        button.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        button.setTextColor(textColor);
        button.setPadding(dp(4), 0, dp(4), 0);
        button.setMinHeight(dp(38));
        button.setMinimumHeight(dp(38));
        button.setBackground(makeBackground(fill, 11, fill == ACCENT ? ACCENT : Color.rgb(50, 65, 88)));
        return button;
    }

    private GradientDrawable makeBackground(int fill, int radius, int stroke) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(fill);
        drawable.setCornerRadius(dp(radius));
        drawable.setStroke(dp(1), stroke);
        return drawable;
    }

    private LinearLayout.LayoutParams matchWrap() {
        return new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
    }

    private int dp(float value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private static final class Move {
        final int axis;
        final int layer;
        final int turns;

        Move(int axis, int layer, int turns) {
            this.axis = axis;
            this.layer = layer;
            this.turns = turns;
        }
    }

    private static final class Piece {
        int[] stickers = new int[6];

        Piece() {
            Arrays.fill(stickers, STICKER_BLACK);
        }
    }

    private static final class Puzzle {
        final int nx;
        final int ny;
        final int nz;
        Piece[][][] pieces;

        Puzzle(int nx, int ny, int nz) {
            this.nx = clamp(nx, 2, 9);
            this.ny = clamp(ny, 2, 9);
            this.nz = clamp(nz, 2, 9);
            reset();
        }

        private static int clamp(int value, int min, int max) {
            return Math.max(min, Math.min(max, value));
        }

        int layerCount(int axis) {
            return axis == 0 ? nx : axis == 1 ? ny : nz;
        }

        boolean canQuarterTurn(int axis) {
            if (axis == 0) return ny == nz;
            if (axis == 1) return nx == nz;
            return nx == ny;
        }

        void reset() {
            pieces = new Piece[nx][ny][nz];
            int red = Color.rgb(220, 56, 65);
            int orange = Color.rgb(255, 145, 50);
            int blue = Color.rgb(55, 130, 255);
            int green = Color.rgb(34, 186, 132);
            int yellow = Color.rgb(255, 207, 54);
            int white = Color.rgb(245, 247, 252);
            for (int x = 0; x < nx; x++) {
                for (int y = 0; y < ny; y++) {
                    for (int z = 0; z < nz; z++) {
                        Piece p = new Piece();
                        if (x == nx - 1) p.stickers[PX] = red;
                        if (x == 0) p.stickers[NX] = orange;
                        if (y == ny - 1) p.stickers[PY] = blue;
                        if (y == 0) p.stickers[NY] = green;
                        if (z == nz - 1) p.stickers[PZ] = white;
                        if (z == 0) p.stickers[NZ] = yellow;
                        pieces[x][y][z] = p;
                    }
                }
            }
        }

        void turn(int axis, int layer, int turns) {
            if (axis < 0 || axis > 2) throw new IllegalArgumentException("Invalid axis");
            if (layer < 0 || layer >= layerCount(axis)) throw new IllegalArgumentException("Invalid slice");
            if (turns == 0) return;
            if (turns != 2 && !canQuarterTurn(axis)) {
                throw new IllegalArgumentException("Quarter turns require a square slice plane");
            }
            if (turns == 2) {
                turnHalf(axis, layer);
                return;
            }
            int repeats = turns < 0 ? 3 : 1;
            for (int i = 0; i < repeats; i++) turnPositiveQuarter(axis, layer);
        }

        private void turnPositiveQuarter(int axis, int layer) {
            Piece[][][] next = new Piece[nx][ny][nz];
            for (int x = 0; x < nx; x++) {
                for (int y = 0; y < ny; y++) {
                    for (int z = 0; z < nz; z++) {
                        Piece piece = pieces[x][y][z];
                        if (coordinate(axis, x, y, z) != layer) {
                            next[x][y][z] = piece;
                            continue;
                        }
                        int xx = x;
                        int yy = y;
                        int zz = z;
                        if (axis == 0) {
                            yy = ny - 1 - z;
                            zz = y;
                        } else if (axis == 1) {
                            xx = z;
                            zz = nx - 1 - x;
                        } else {
                            xx = nx - 1 - y;
                            yy = x;
                        }
                        rotateStickers(piece, axis);
                        next[xx][yy][zz] = piece;
                    }
                }
            }
            pieces = next;
        }

        private void turnHalf(int axis, int layer) {
            Piece[][][] next = new Piece[nx][ny][nz];
            for (int x = 0; x < nx; x++) {
                for (int y = 0; y < ny; y++) {
                    for (int z = 0; z < nz; z++) {
                        Piece piece = pieces[x][y][z];
                        if (coordinate(axis, x, y, z) != layer) {
                            next[x][y][z] = piece;
                            continue;
                        }
                        int xx = x;
                        int yy = y;
                        int zz = z;
                        if (axis == 0) {
                            yy = ny - 1 - y;
                            zz = nz - 1 - z;
                        } else if (axis == 1) {
                            xx = nx - 1 - x;
                            zz = nz - 1 - z;
                        } else {
                            xx = nx - 1 - x;
                            yy = ny - 1 - y;
                        }
                        rotateStickers(piece, axis);
                        rotateStickers(piece, axis);
                        next[xx][yy][zz] = piece;
                    }
                }
            }
            pieces = next;
        }

        private int coordinate(int axis, int x, int y, int z) {
            return axis == 0 ? x : axis == 1 ? y : z;
        }

        private void rotateStickers(Piece piece, int axis) {
            int[] rotated = new int[6];
            Arrays.fill(rotated, STICKER_BLACK);
            for (int oldDir = 0; oldDir < 6; oldDir++) {
                rotated[rotatedDirection(axis, oldDir)] = piece.stickers[oldDir];
            }
            piece.stickers = rotated;
        }

        private static int rotatedDirection(int axis, int direction) {
            if (axis == 0) {
                if (direction == PY) return PZ;
                if (direction == PZ) return NY;
                if (direction == NY) return NZ;
                if (direction == NZ) return PY;
                return direction;
            }
            if (axis == 1) {
                if (direction == PX) return NZ;
                if (direction == NZ) return NX;
                if (direction == NX) return PZ;
                if (direction == PZ) return PX;
                return direction;
            }
            if (direction == PX) return PY;
            if (direction == PY) return NX;
            if (direction == NX) return NY;
            if (direction == NY) return PX;
            return direction;
        }
    }

    private static final class PuzzleView extends View {
        private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final ScaleGestureDetector scaleDetector;
        private Puzzle puzzle;
        private float yaw = -0.65f;
        private float pitch = -0.55f;
        private float zoom = 1f;
        private float lastX;
        private float lastY;
        private boolean dragging;

        PuzzleView(Activity activity) {
            super(activity);
            setLayerType(View.LAYER_TYPE_SOFTWARE, null);
            scaleDetector = new ScaleGestureDetector(activity, new ScaleGestureDetector.SimpleOnScaleGestureListener() {
                @Override public boolean onScale(ScaleGestureDetector detector) {
                    zoom = Math.max(0.62f, Math.min(1.65f, zoom * detector.getScaleFactor()));
                    invalidate();
                    return true;
                }
            });
        }

        void setPuzzle(Puzzle puzzle) {
            this.puzzle = puzzle;
            invalidate();
        }

        @Override
        public boolean onTouchEvent(MotionEvent event) {
            scaleDetector.onTouchEvent(event);
            switch (event.getActionMasked()) {
                case MotionEvent.ACTION_DOWN:
                    lastX = event.getX();
                    lastY = event.getY();
                    dragging = true;
                    return true;
                case MotionEvent.ACTION_POINTER_DOWN:
                    dragging = false;
                    return true;
                case MotionEvent.ACTION_MOVE:
                    if (dragging && event.getPointerCount() == 1 && !scaleDetector.isInProgress()) {
                        float dx = event.getX() - lastX;
                        float dy = event.getY() - lastY;
                        yaw += dx * 0.009f;
                        pitch = Math.max(-1.25f, Math.min(0.95f, pitch - dy * 0.008f));
                        lastX = event.getX();
                        lastY = event.getY();
                        invalidate();
                    }
                    return true;
                case MotionEvent.ACTION_POINTER_UP:
                    lastX = event.getX();
                    lastY = event.getY();
                    dragging = false;
                    return true;
                case MotionEvent.ACTION_UP:
                    dragging = false;
                    performClick();
                    return true;
                case MotionEvent.ACTION_CANCEL:
                    dragging = false;
                    return true;
                default:
                    return true;
            }
        }

        @Override
        public boolean performClick() {
            super.performClick();
            return true;
        }

        @Override
        protected void onDraw(Canvas canvas) {
            super.onDraw(canvas);
            canvas.drawColor(BG);
            if (puzzle == null || getWidth() <= 0 || getHeight() <= 0) return;

            int w = getWidth();
            int h = getHeight();
            float horizontalUnit = (w * 0.84f) / (puzzle.nx + puzzle.ny);
            float verticalUnit = (h * 0.78f) /
                    (puzzle.nz + (puzzle.nx + puzzle.ny) * 0.47f);
            float unit = Math.max(2f, Math.min(horizontalUnit, verticalUnit)) * zoom;
            float centerX = w * 0.5f;
            float centerY = h * 0.49f;
            float[] shadowCenter = new float[]{centerX, h * 0.81f};
            paint.setStyle(Paint.Style.FILL);
            paint.setColor(Color.argb(52, 0, 0, 0));
            canvas.drawOval(new RectF(shadowCenter[0] - unit * (puzzle.nx + puzzle.ny) * 0.30f,
                    shadowCenter[1] - unit * 0.12f,
                    shadowCenter[0] + unit * (puzzle.nx + puzzle.ny) * 0.30f,
                    shadowCenter[1] + unit * 0.12f), paint);

            List<Face> faces = new ArrayList<>();
            for (int x = 0; x < puzzle.nx; x++) {
                for (int y = 0; y < puzzle.ny; y++) {
                    for (int z = 0; z < puzzle.nz; z++) {
                        Piece p = puzzle.pieces[x][y][z];
                        float cx = x - (puzzle.nx - 1) / 2f;
                        float cy = y - (puzzle.ny - 1) / 2f;
                        float cz = z - (puzzle.nz - 1) / 2f;
                        if (x == puzzle.nx - 1) addFace(faces, p, PX, cx, cy, cz, unit, centerX, centerY);
                        if (x == 0) addFace(faces, p, NX, cx, cy, cz, unit, centerX, centerY);
                        if (y == puzzle.ny - 1) addFace(faces, p, PY, cx, cy, cz, unit, centerX, centerY);
                        if (y == 0) addFace(faces, p, NY, cx, cy, cz, unit, centerX, centerY);
                        if (z == puzzle.nz - 1) addFace(faces, p, PZ, cx, cy, cz, unit, centerX, centerY);
                        if (z == 0) addFace(faces, p, NZ, cx, cy, cz, unit, centerX, centerY);
                    }
                }
            }
            Collections.sort(faces, Comparator.comparingDouble(face -> face.depth));
            paint.setStrokeJoin(Paint.Join.ROUND);
            for (Face face : faces) {
                Path path = new Path();
                path.moveTo(face.points[0][0], face.points[0][1]);
                for (int i = 1; i < face.points.length; i++) path.lineTo(face.points[i][0], face.points[i][1]);
                path.close();
                paint.setColor(face.color);
                paint.setStyle(Paint.Style.FILL);
                canvas.drawPath(path, paint);
                paint.setStyle(Paint.Style.STROKE);
                paint.setStrokeWidth(Math.max(1.1f, unit * 0.035f));
                paint.setColor(Color.rgb(11, 16, 25));
                canvas.drawPath(path, paint);
            }

            paint.setStyle(Paint.Style.FILL);
            paint.setColor(MUTED);
            paint.setTextSize(Math.max(10f, getResources().getDisplayMetrics().density * 10.5f));
            paint.setTextAlign(Paint.Align.CENTER);
            canvas.drawText(puzzle.nx + " × " + puzzle.ny + " × " + puzzle.nz,
                    centerX, h - dp(getContext(), 8), paint);
        }

        private void addFace(List<Face> faces, Piece piece, int direction,
                             float x, float y, float z, float unit, float centerX, float centerY) {
            float[] normal = direction == PX ? new float[]{1, 0, 0}
                    : direction == NX ? new float[]{-1, 0, 0}
                    : direction == PY ? new float[]{0, 1, 0}
                    : direction == NY ? new float[]{0, -1, 0}
                    : direction == PZ ? new float[]{0, 0, 1}
                    : new float[]{0, 0, -1};
            float[] transformedNormal = transform(normal[0], normal[1], normal[2]);
            if (transformedNormal[2] <= 0.015f) return;

            float half = 0.475f;
            float[][] vertices;
            if (direction == PX) {
                vertices = new float[][]{{x + half, y - half, z - half}, {x + half, y + half, z - half},
                        {x + half, y + half, z + half}, {x + half, y - half, z + half}};
            } else if (direction == NX) {
                vertices = new float[][]{{x - half, y + half, z - half}, {x - half, y - half, z - half},
                        {x - half, y - half, z + half}, {x - half, y + half, z + half}};
            } else if (direction == PY) {
                vertices = new float[][]{{x - half, y + half, z - half}, {x + half, y + half, z - half},
                        {x + half, y + half, z + half}, {x - half, y + half, z + half}};
            } else if (direction == NY) {
                vertices = new float[][]{{x + half, y - half, z - half}, {x - half, y - half, z - half},
                        {x - half, y - half, z + half}, {x + half, y - half, z + half}};
            } else if (direction == PZ) {
                vertices = new float[][]{{x - half, y - half, z + half}, {x + half, y - half, z + half},
                        {x + half, y + half, z + half}, {x - half, y + half, z + half}};
            } else {
                vertices = new float[][]{{x - half, y + half, z - half}, {x + half, y + half, z - half},
                        {x + half, y - half, z - half}, {x - half, y - half, z - half}};
            }

            float[][] projected = new float[4][2];
            float depth = 0;
            for (int i = 0; i < vertices.length; i++) {
                float[] p = transform(vertices[i][0], vertices[i][1], vertices[i][2]);
                projected[i][0] = centerX + p[0] * unit;
                projected[i][1] = centerY - p[1] * unit;
                depth += p[2] / vertices.length;
            }
            int color = piece.stickers[direction];
            if (color == STICKER_BLACK) color = Color.rgb(48, 57, 72);
            color = shade(color, direction);
            faces.add(new Face(projected, color, depth));
        }

        private float[] transform(float x, float y, float z) {
            float cy = (float) Math.cos(yaw);
            float sy = (float) Math.sin(yaw);
            float cp = (float) Math.cos(pitch);
            float sp = (float) Math.sin(pitch);
            float xr = x * cy - y * sy;
            float yr = x * sy + y * cy;
            float y2 = yr * cp - z * sp;
            float z2 = yr * sp + z * cp;
            return new float[]{xr, y2, z2};
        }

        private int shade(int color, int direction) {
            float factor = direction == PZ ? 1.0f : direction == PX ? 0.82f :
                    direction == NY ? 0.72f : direction == PY ? 0.62f :
                            direction == NX ? 0.68f : 0.54f;
            int a = Color.alpha(color);
            int r = Math.min(255, Math.round(Color.red(color) * factor));
            int g = Math.min(255, Math.round(Color.green(color) * factor));
            int b = Math.min(255, Math.round(Color.blue(color) * factor));
            return Color.argb(a, r, g, b);
        }

        private static int dp(Activity activity, float value) {
            return Math.round(value * activity.getResources().getDisplayMetrics().density);
        }
    }

    private static final class Face {
        final float[][] points;
        final int color;
        final float depth;

        Face(float[][] points, int color, float depth) {
            this.points = points;
            this.color = color;
            this.depth = depth;
        }
    }
}
