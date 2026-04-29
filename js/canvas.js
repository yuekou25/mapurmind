const canvas = new fabric.Canvas('mindmapCanvas', {
    width: window.innerWidth,
    height: window.innerHeight,
    selection: false 
});

// 1. CHUYỂN ĐỔI GIAO DIỆN
const container = document.getElementById('canvas-container');
document.getElementById('themeSelect').addEventListener('change', (e) => { container.className = `theme-${e.target.value} pattern-${document.getElementById('patternSelect').value}`; });
document.getElementById('patternSelect').addEventListener('change', (e) => { container.className = `theme-${document.getElementById('themeSelect').value} pattern-${e.target.value}`; });

// 2. TẠO Ô VÀ CHỮ (ĐƯỢC TÁCH RỜI ĐỂ DỄ SỬA TEXT)
function createNode(x, y, textStr = 'Nháy đúp để sửa') {
    const id = 'node_' + Date.now() + Math.floor(Math.random() * 1000);
    
    // Khối hình chữ nhật (Người dùng chỉ bấm vào khối này để di chuyển)
    const rect = new fabric.Rect({
        left: x, top: y, width: 160, height: 60, rx: 8, ry: 8,
        fill: document.getElementById('fillColor').value, 
        stroke: document.getElementById('borderColor').value, strokeWidth: 2,
        originX: 'center', originY: 'center',
        isNode: true, id: id, lines: [] // Cài đặt thuộc tính tùy chỉnh
    });

    // Đoạn text (Bám dính vào khối chữ nhật)
    const text = new fabric.IText(textStr, {
        left: x, top: y, fontSize: 18, fontFamily: 'Arial', fill: '#333',
        originX: 'center', originY: 'center',
        isText: true, id: 'text_' + id, rectId: id,
        selectable: false, evented: false // Khóa text lại để không kéo nhầm
    });

    // Trói 2 đối tượng vào nhau
    rect.textId = text.id;
    rect.textObj = text;

    canvas.add(rect, text);
    return rect;
}

document.getElementById('btnAddNode').addEventListener('click', () => {
    const vpt = canvas.viewportTransform;
    createNode(-vpt[4]/vpt[0] + window.innerWidth/2, -vpt[5]/vpt[3] + window.innerHeight/2);
});

// 3. XỬ LÝ NHÁY ĐÚP ĐỂ SỬA CHỮ
canvas.on('mouse:dblclick', (e) => {
    if (e.target && e.target.isNode && e.target.textObj) {
        const t = e.target.textObj;
        t.set({ selectable: true, evented: true }); // Mở khóa text
        canvas.setActiveObject(t);
        t.enterEditing();
        t.selectAll();
    }
});

// Khi sửa chữ xong, khóa text lại như cũ
canvas.on('text:editing:exited', (e) => {
    const t = e.target;
    if (t.isText) {
        t.set({ selectable: false, evented: false });
    }
});

// 4. THUẬT TOÁN NỐI DÂY CAO SU
let isLineMode = false;
let firstNode = null;

document.getElementById('btnLineMode').addEventListener('click', (e) => {
    isLineMode = !isLineMode;
    e.target.innerText = isLineMode ? "🔗 Đang nối (Bật)" : "🔗 Nối dây (Tắt)";
    e.target.style.background = isLineMode ? "#e74c3c" : "transparent";
});

canvas.on('mouse:down', (o) => {
    // Chỉ nối nếu bấm vào một Ô (isNode)
    if (isLineMode && o.target && o.target.isNode) {
        if (!firstNode) {
            firstNode = o.target;
            firstNode.set('stroke', '#e74c3c'); // Sáng viền đỏ báo hiệu đang chọn
            canvas.renderAll();
        } else {
            // Nếu bấm vào ô thứ 2, tiến hành tạo dây
            if (firstNode !== o.target) {
                const isDashed = document.getElementById('lineStyle').value === 'dashed';
                const line = new fabric.Line([firstNode.left, firstNode.top, o.target.left, o.target.top], {
                    stroke: '#555', strokeWidth: 3, selectable: false, evented: false,
                    strokeDashArray: isDashed ? [10, 5] : null,
                    isLine: true, node1Id: firstNode.id, node2Id: o.target.id
                });
                
                // Lưu tham chiếu chéo giữa Ô và Dây
                line.node1 = firstNode; line.node2 = o.target;
                firstNode.lines.push(line);
                o.target.lines.push(line);

                canvas.add(line);
                canvas.sendToBack(line); // Giấu dây ra sau các ô
            }
            
            firstNode.set('stroke', document.getElementById('borderColor').value); // Trả lại viền cũ
            firstNode = null;
            canvas.renderAll();
        }
    }
});

// Logic kéo Ô -> Dây và Text đi theo
canvas.on('object:moving', (e) => {
    const obj = e.target;
    if (obj.isNode) {
        // Cập nhật vị trí Text
        if (obj.textObj) {
            obj.textObj.set({ left: obj.left, top: obj.top });
            obj.textObj.setCoords();
        }
        // Cập nhật vị trí Dây
        if (obj.lines) {
            obj.lines.forEach(line => {
                if (line.node1 === obj) line.set({ x1: obj.left, y1: obj.top });
                if (line.node2 === obj) line.set({ x2: obj.left, y2: obj.top });
            });
        }
    }
});

// 5. CANVAS VÔ HẠN (ZOOM & PAN)
canvas.on('mouse:wheel', function(opt) {
    let delta = opt.e.deltaY;
    let zoom = canvas.getZoom() * (0.999 ** delta);
    if (zoom > 5) zoom = 5; if (zoom < 0.2) zoom = 0.2;
    canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
    opt.e.preventDefault(); opt.e.stopPropagation();
});

canvas.on('mouse:down', function(opt) {
    if (opt.e.altKey === true) { // Giữ Alt để di chuyển góc nhìn
        this.isDragging = true; this.lastPosX = opt.e.clientX; this.lastPosY = opt.e.clientY;
    }
});
canvas.on('mouse:move', function(opt) {
    if (this.isDragging) {
        let e = opt.e; let vpt = this.viewportTransform;
        vpt[4] += e.clientX - this.lastPosX; vpt[5] += e.clientY - this.lastPosY;
        this.requestRenderAll();
        this.lastPosX = e.clientX; this.lastPosY = e.clientY;
    }
});
canvas.on('mouse:up', function(opt) { this.isDragging = false; });

// 6. XÓA BẰNG PHÍM TẮT & ĐỔI MÀU
window.addEventListener('keydown', (e) => {
    if (e.key === "Delete" || e.key === "Backspace") {
        const activeObj = canvas.getActiveObject();
        if (activeObj && activeObj.isEditing) return; // Đang gõ chữ thì không xóa

        if (activeObj && activeObj.isNode) {
            if (activeObj.textObj) canvas.remove(activeObj.textObj);
            if (activeObj.lines) {
                activeObj.lines.forEach(l => {
                    canvas.remove(l);
                    // Rút dây ra khỏi ô ở đầu bên kia
                    const otherNode = l.node1 === activeObj ? l.node2 : l.node1;
                    if (otherNode && otherNode.lines) {
                        otherNode.lines = otherNode.lines.filter(line => line !== l);
                    }
                });
            }
            canvas.remove(activeObj);
            canvas.discardActiveObject().renderAll();
        }
    }
});

document.getElementById('fillColor').addEventListener('input', (e) => {
    const activeObj = canvas.getActiveObject();
    if (activeObj && activeObj.isNode) { activeObj.set('fill', e.target.value); canvas.renderAll(); }
});

// 7. LƯU & TẢI TRÊN TRÌNH DUYỆT (LOCAL STORAGE)
const saveProperties = ['id', 'isNode', 'isText', 'isLine', 'textId', 'rectId', 'node1Id', 'node2Id', 'selectable', 'evented'];

document.getElementById('btnSaveLocal').addEventListener('click', () => {
    const json = JSON.stringify(canvas.toJSON(saveProperties));
    localStorage.setItem('mindmap_local', json);
    alert("✅ Đã lưu sơ đồ vào bộ nhớ trình duyệt!");
});

document.getElementById('btnLoadLocal').addEventListener('click', () => {
    const data = localStorage.getItem('mindmap_local');
    if (!data) return alert("❌ Không tìm thấy dữ liệu đã lưu!");
    
    canvas.loadFromJSON(data, () => {
        const objects = canvas.getObjects();
        const nodes = {}, texts = {};
        
        // Phân loại và khôi phục ID
        objects.forEach(obj => {
            if (obj.isNode) { nodes[obj.id] = obj; obj.lines = []; }
            if (obj.isText) { texts[obj.id] = obj; }
        });

        // Nối lại xương khớp cho các bộ phận
        objects.forEach(obj => {
            if (obj.isNode && obj.textId) { obj.textObj = texts[obj.textId]; }
            if (obj.isLine) {
                const n1 = nodes[obj.node1Id]; const n2 = nodes[obj.node2Id];
                if (n1 && n2) { obj.node1 = n1; obj.node2 = n2; n1.lines.push(obj); n2.lines.push(obj); }
            }
        });
        canvas.renderAll();
    });
});

// 8. XUẤT ẢNH
document.getElementById('btnExportImg').addEventListener('click', () => {
    const currentZoom = canvas.getZoom(); canvas.setZoom(1);
    const link = document.createElement('a');
    link.download = 'mindmap.png'; link.href = canvas.toDataURL({ format: 'png', multiplier: 2 });
    link.click();
    canvas.setZoom(currentZoom);
});
