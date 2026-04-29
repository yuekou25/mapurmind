const canvas = new fabric.Canvas('mindmapCanvas', {
    width: window.innerWidth,
    height: window.innerHeight,
    selection: false 
});

// 1. ĐỔI GIAO DIỆN & HỌA TIẾT
const container = document.getElementById('canvas-container');
document.getElementById('themeSelect').addEventListener('change', (e) => {
    container.className = `theme-${e.target.value} pattern-${document.getElementById('patternSelect').value}`;
});
document.getElementById('patternSelect').addEventListener('change', (e) => {
    container.className = `theme-${document.getElementById('themeSelect').value} pattern-${e.target.value}`;
});

// 2. TẠO Ô (NODE) MỚI
function createNode(x, y, textStr = 'Ý tưởng mới') {
    const rect = new fabric.Rect({
        width: 160, height: 60, fill: document.getElementById('fillColor').value, 
        stroke: document.getElementById('borderColor').value, strokeWidth: 2, rx: 8, ry: 8,
        originX: 'center', originY: 'center'
    });
    const text = new fabric.IText(textStr, {
        fontSize: 18, fontFamily: 'Arial', originX: 'center', originY: 'center', fill: '#333'
    });
    const group = new fabric.Group([rect, text], { 
        left: x, top: y, hasControls: true, originX: 'center', originY: 'center' 
    });
    
    // Lưu trữ mảng chứa các đường dây kết nối với ô này
    group.lines = [];
    canvas.add(group);
    return group;
}

document.getElementById('btnAddNode').addEventListener('click', () => {
    // Tạo ô ở giữa màn hình hiện tại
    const vpt = canvas.viewportTransform;
    createNode(-vpt[4]/vpt[0] + window.innerWidth/2, -vpt[5]/vpt[3] + window.innerHeight/2);
});

// 3. THUẬT TOÁN NỐI DÂY ĐỘNG (Dây chạy theo Ô)
let isLineMode = false;
let firstNode = null;

document.getElementById('btnLineMode').addEventListener('click', (e) => {
    isLineMode = !isLineMode;
    e.target.innerText = isLineMode ? "🔗 Đang nối (Bật)" : "🔗 Nối dây (Tắt)";
    e.target.style.background = isLineMode ? "#e74c3c" : "transparent";
});

canvas.on('mouse:down', (o) => {
    if (isLineMode && o.target && o.target.type === 'group') {
        if (!firstNode) {
            firstNode = o.target;
            firstNode.item(0).set('stroke', '#e74c3c'); // Đỏ lên khi chọn
            canvas.renderAll();
        } else {
            const isDashed = document.getElementById('lineStyle').value === 'dashed';
            const line = new fabric.Line([firstNode.left, firstNode.top, o.target.left, o.target.top], {
                stroke: '#555', strokeWidth: 3, selectable: false, evented: false,
                strokeDashArray: isDashed ? [10, 5] : null // Chế độ nét đứt
            });
            
            // Gắn thông tin 2 đầu dây
            line.node1 = firstNode;
            line.node2 = o.target;
            
            // Cập nhật dây vào mảng của 2 ô
            firstNode.lines.push(line);
            o.target.lines.push(line);

            canvas.add(line);
            canvas.sendToBack(line);
            
            firstNode.item(0).set('stroke', document.getElementById('borderColor').value);
            firstNode = null;
            canvas.renderAll();
        }
    }
});

// Khi kéo ô, cập nhật tọa độ của tất cả dây gắn với ô đó
canvas.on('object:moving', (e) => {
    const obj = e.target;
    if (obj.lines && obj.lines.length > 0) {
        obj.lines.forEach(line => {
            if (line.node1 === obj) { line.set({ x1: obj.left, y1: obj.top }); }
            if (line.node2 === obj) { line.set({ x2: obj.left, y2: obj.top }); }
        });
    }
    canvas.renderAll();
});

// 4. CANVAS VÔ HẠN (ZOOM & PAN)
// Lăn chuột để phóng to/thu nhỏ
canvas.on('mouse:wheel', function(opt) {
    let delta = opt.e.deltaY;
    let zoom = canvas.getZoom() * (0.999 ** delta);
    if (zoom > 5) zoom = 5; if (zoom < 0.2) zoom = 0.2; // Giới hạn zoom
    canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
    opt.e.preventDefault();
    opt.e.stopPropagation();
});

// Giữ phím Alt + Kéo chuột để di chuyển vùng nhìn (Pan)
canvas.on('mouse:down', function(opt) {
    let evt = opt.e;
    if (evt.altKey === true) {
        this.isDragging = true;
        this.selection = false;
        this.lastPosX = evt.clientX;
        this.lastPosY = evt.clientY;
    }
});
canvas.on('mouse:move', function(opt) {
    if (this.isDragging) {
        let e = opt.e;
        let vpt = this.viewportTransform;
        vpt[4] += e.clientX - this.lastPosX;
        vpt[5] += e.clientY - this.lastPosY;
        this.requestRenderAll();
        this.lastPosX = e.clientX;
        this.lastPosY = e.clientY;
    }
});
canvas.on('mouse:up', function(opt) {
    this.setViewportTransform(this.viewportTransform);
    this.isDragging = false;
    this.selection = true;
});

// 5. PHÍM TẮT XÓA & TÙY CHỈNH MÀU
window.addEventListener('keydown', (e) => {
    if (e.key === "Delete") {
        const activeObj = canvas.getActiveObject();
        if (activeObj) {
            // Nếu xóa ô, phải xóa luôn các dây gắn với nó
            if (activeObj.lines) {
                activeObj.lines.forEach(line => canvas.remove(line));
            }
            canvas.remove(activeObj);
            canvas.discardActiveObject().renderAll();
        }
    }
});

// Đổi màu ngay khi đang chọn ô
document.getElementById('fillColor').addEventListener('input', (e) => {
    const activeObj = canvas.getActiveObject();
    if (activeObj && activeObj.type === 'group') {
        activeObj.item(0).set('fill', e.target.value);
        canvas.renderAll();
    }
});

// 6. XUẤT FILE 
document.getElementById('btnExportImg').addEventListener('click', () => {
    // Reset zoom về 1 trước khi xuất để tránh mờ
    const currentZoom = canvas.getZoom();
    canvas.setZoom(1);
    const link = document.createElement('a');
    link.download = 'mindmap.png';
    link.href = canvas.toDataURL({ format: 'png', multiplier: 2 });
    link.click();
    canvas.setZoom(currentZoom); // Trả lại zoom cũ
});

document.getElementById('btnExportPDF').addEventListener('click', () => {
    window.jspdf = window.jspdf || {};
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('l', 'mm', 'a4'); // Khổ A4 nằm ngang
    
    const imgData = canvas.toDataURL({ format: 'jpeg', quality: 1.0 });
    // Tính toán tỷ lệ vừa trang A4
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('mindmap.pdf');
});
