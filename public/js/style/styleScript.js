// background style neuro dev by web beks telegram
// https://t.me/webbeks/967

const canvasEl = document.querySelector("canvas#neuro");
const devicePixelRatio = Math.min(window.devicePixelRatio, 2);

const pointer = {
    x: 0,
    y: 0,
    tX: 0,
    tY: 0,
};

let uniforms;
let gl;

// Ajuster le canvas à la taille de la fenêtre
function adjustCanvasSize() {
    if (canvasEl) {
        canvasEl.style.width = '100vw';
        canvasEl.style.height = '100vh';
        canvasEl.style.position = 'fixed';
        canvasEl.style.top = '0';
        canvasEl.style.left = '0';
        canvasEl.style.zIndex = '-2';
        canvasEl.style.pointerEvents = 'none';
    }
}

// Appliquer immédiatement le dimensionnement
adjustCanvasSize();

// Chargement asynchrone des fichiers GLSL
async function loadShaderSource(filePath) {
    const response = await fetch(filePath);
    return await response.text();
}

// Initialisation des shaders avec les fichiers externes
async function initShader() {
    if (!canvasEl) {
        console.error("Canvas element not found");
        return null;
    }

    const vsSource = await loadShaderSource("/public/js/style/shader/vertexShader.glsl");
    const fsSource = await loadShaderSource("/public/js/style/shader/fragmentShader.glsl");

    const gl = canvasEl.getContext("webgl") || canvasEl.getContext("experimental-webgl");
    
    if (!gl) {
        console.error("WebGL not supported");
        return null;
    }

    function createShader(gl, sourceCode, type) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, sourceCode);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }

    const vertexShader = createShader(gl, vsSource, gl.VERTEX_SHADER);
    const fragmentShader = createShader(gl, fsSource, gl.FRAGMENT_SHADER);
    
    if (!vertexShader || !fragmentShader) {
        return null;
    }

    function createShaderProgram(gl, vertexShader, fragmentShader) {
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program linking error:', gl.getProgramInfoLog(program));
            return null;
        }
        
        return program;
    }

    const shaderProgram = createShaderProgram(gl, vertexShader, fragmentShader);
    
    if (!shaderProgram) {
        return null;
    }
    
    uniforms = getUniforms(shaderProgram);

    function getUniforms(program) {
        const uniforms = {};
        const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < uniformCount; i++) {
            const uniformName = gl.getActiveUniform(program, i).name;
            uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
        }
        return uniforms;
    }

    const vertices = new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0]);

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.useProgram(shaderProgram);

    const positionLocation = gl.getAttribLocation(shaderProgram, "a_position");
    gl.enableVertexAttribArray(positionLocation);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    return gl;
}

function render() {
    if (!gl) return;
    
    const currentTime = performance.now();

    pointer.x += (pointer.tX - pointer.x) * 0.5;
    pointer.y += (pointer.tY - pointer.y) * 0.5;

    gl.uniform1f(uniforms.u_time, currentTime);
    gl.uniform2f(
        uniforms.u_pointer_position,
        pointer.x / window.innerWidth,
        1 - pointer.y / window.innerHeight
    );
    gl.uniform1f(uniforms.u_scroll_progress, window.pageYOffset / (document.body.scrollHeight - window.innerHeight || 1));

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(render);
}

function resizeCanvas() {
    if (!canvasEl || !gl) return;
    
    // Ajuster la taille physique du canvas à la taille de la fenêtre
    canvasEl.width = window.innerWidth * devicePixelRatio;
    canvasEl.height = window.innerHeight * devicePixelRatio;
    
    if (uniforms && uniforms.u_ratio) {
    gl.uniform1f(uniforms.u_ratio, canvasEl.width / canvasEl.height);
    }
    
    gl.viewport(0, 0, canvasEl.width, canvasEl.height);
}

function setupEvents() {
    window.addEventListener("pointermove", (e) => {
        updateMousePosition(e.clientX, e.clientY);
    });
    window.addEventListener("touchmove", (e) => {
        updateMousePosition(e.targetTouches[0].clientX, e.targetTouches[0].clientY);
    });
    window.addEventListener("click", (e) => {
        updateMousePosition(e.clientX, e.clientY);
    });

    function updateMousePosition(eX, eY) {
        pointer.tX = eX;
        pointer.tY = eY;
    }
}

// Initialisation de la scène
(async function initialize() {
    // S'assurer que le document est complètement chargé
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAfterDOMLoaded);
    } else {
        initAfterDOMLoaded();
    }

    async function initAfterDOMLoaded() {
        // Réajuster la taille du canvas
        adjustCanvasSize();
        
        // Initialiser WebGL
    gl = await initShader();
        
    if (gl) {
        setupEvents();
        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);
        render();
        } else {
            console.error("Failed to initialize WebGL");
        }
    }
})();
