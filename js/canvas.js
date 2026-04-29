const canvas = new fabric.Canvas('mindmapCanvas', {
    width: window.innerWidth,
    height: window.innerHeight - 50,
    selection: true // Cho phép chọn nhiều đối tượng
});

// Chức năng đổi Giao diện & Họa tiết
const container = document.getElementById('canvas-container');
document.getElementById('themeSelect').addEventListener('change', (e) => {
    container.className = `theme-${e.target.value} pattern-${document.getElementById('patternSelect').value}`;
});

document.getElementById('patternSelect').addEventListener('change', (e) => {
    container.className = `theme-${document.getElementById('themeSelect').value} pattern-${e.target.value}`;
});

// Thêm Ô (Node)
document.getElementById('btnAddNode').addEventListener('click', () => {
    const rect = new fabric.Rect({
        width: 150, height: 60, fill: '#fff', stroke: '#333', strokeWidth: 2, rx: 10, ry: 10,
        originX: 'center', originY: 'center'
    });
    const text = new fabric.IText('Ý tưởng mới', {
        fontSize: 18, originX: 'center', originY: 'center'
    });
    const group = new fabric.Group([rect, text], { left: 100, top: 100 });
    canvas.add(group);
});

// Chức năng nối dây (Logic cơ bản)
let isLineMode = false;
let firstNode = null;

document.getElementById('btnLineMode').addEventListener('click', (e) => {
    isLineMode = !isLineMode;
    e.target.innerText = isLineMode ? "🔗 Đang nối (Bật)" : "🔗 Nối dây (Tắt)";
    e.target.style.background = isLineMode ? "#e74c3c" : "#fff";
    
    // Tắt chọn đối tượng khi đang ở chế độ nối dây
    canvas.getObjects().forEach(obj => obj.set('selectable', !isLineMode));
});

canvas.on('mouse:down', (options) => {
    if (isLineMode && options.target && options.target.type === 'group') {
        if (!firstNode) {
            firstNode = options.target;
            firstNode.item(0).set('stroke', 'red'); // Đánh dấu ô đang chọn
            canvas.renderAll();
        } else {
            const line = new fabric.Line([
                firstNode.left + firstNode.width/2, firstNode.top + firstNode.height/2,
                options.target.left + options.target.width/2, options.target.top + options.target.height/2
            ], {
                stroke: '#555', strokeWidth: 2, selectable: true
            });
            canvas.add(line);
            canvas.sendToBack(line); // Đẩy dây xuống dưới ô
            
            firstNode.item(0).set('stroke', '#333'); // Trả lại màu cũ
            firstNode = null;
            canvas.renderAll();
        }
    }
});

// Phím tắt: Delete để xóa đối tượng đang chọn
window.addEventListener('keydown', (e) => {
    if (e.key === "Delete") {
        canvas.getActiveObjects().forEach(obj => canvas.remove(obj));
        canvas.discardActiveObject().renderAll();
    }
});

// Xuất ảnh PNG
document.getElementById('btnExport').addEventListener('click', () => {
    const dataURL = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 });
    const link = document.createElement('a');
    link.download = 'so-do-tu-duy.png';
    link.href = dataURL;
    link.click();
});
