# 🚀 3D Gaussian Splat Renderer & Viewer

<p align="center">
Fast, lightweight <b>WebGL renderer</b> for visualizing <b>3D Gaussian Splats</b> directly in the browser.
</p>

<p align="center">
<a href="https://3d-gaussian-splat-renderer-and-viewer.pages.dev/"><b>Live Demo</b></a>
</p>

---

# 🎥 Demo

![Video Project 3 (4)](https://github.com/user-attachments/assets/2ee65614-7c54-4fce-9537-b2eff4761e87)



Interactive Gaussian Splat rendering directly in the browser.

---

# 🧩 Tech Stack

| Layer | Technology |
|------|------------|
| Rendering Engine | **WebGL** |
| Language | **JavaScript (ES Modules)** |
| Build Tool | **Vite** |
| GPU Programming | **GLSL Shaders** |
| UI | **HTML5 + CSS** |
| Data | **Gaussian Splat datasets** |

---

# ✨ Features

- 🌐 Browser-based Gaussian Splat rendering
- ⚡ GPU accelerated rendering pipeline
- 🎮 Orbit camera navigation
- 🧭 FPS exploration mode
- 📂 Drag-and-drop dataset loading
- 🔄 Coordinate system alignment tools
- 📷 Screenshot export
- 💾 Viewer state import/export
- ⚙ Adjustable render resolution and LOD

---

# 📦 Supported Formats

```
.ply
.spz
.sog
.splat
.ksplat
```

---

# 🧠 How Gaussian Splatting Works

Gaussian Splatting represents a 3D scene as a collection of **anisotropic Gaussian primitives** instead of traditional meshes or voxels.

Each splat contains:

- Position in 3D space  
- Scale and orientation  
- Color and opacity  
- Radiance information

During rendering:

1. Splats are projected onto the image plane  
2. Each Gaussian contributes color and opacity  
3. The renderer blends them using a GPU pipeline  
4. The result forms a continuous view of the scene

Advantages:

- Extremely fast rendering
- High visual fidelity
- Efficient for real-time visualization
- Works well for neural scene reconstruction

---

# 🏗 Rendering Architecture

<img width="512" height="768" alt="Image Mar 8, 2026, 12_51_28 AM" src="https://github.com/user-attachments/assets/7a0b5197-ec62-4c5e-b645-fc33a98acea3" />


Pipeline overview:

```
Gaussian Dataset
      │
      ▼
Dataset Loader
      │
      ▼
GPU Buffer Upload
      │
      ▼
Vertex Shader
      │
      ▼
Gaussian Projection
      │
      ▼
Fragment Shader
      │
      ▼
Screen Rendering
```

---

# 🎮 Controls

## Orbit Mode

| Action | Control |
|------|------|
| Rotate | Left Mouse Drag |
| Pan | Right Mouse Drag |
| Zoom | Mouse Wheel |
| Focus | Double Click |

---

## FPS Mode

| Action | Key |
|------|------|
| Move Forward | W |
| Move Back | S |
| Move Left | A |
| Move Right | D |
| Move Up | E |
| Move Down | Q |
| Look | Mouse |

---

# ⚡ Performance

The renderer is optimized for **real-time performance on consumer hardware**.

Optimization techniques:

- GPU-based splat rendering
- Level of Detail control
- Adjustable render resolution
- Efficient WebGL buffers
- Minimal UI overhead

Example performance:

| Device | Dataset Size | FPS |
|------|------|------|
| Laptop Integrated GPU | 500k splats | 30–45 FPS |
| Mid-range GPU | 1M splats | 50–70 FPS |
| High-end GPU | 2M+ splats | 90+ FPS |

---

# 📦 Sample Dataset

Download a sample dataset:

https://drive.google.com/file/d/1tKIAsd-nzQT9KVuROMvRQPcPe2xYQL87/view

Testing steps:

1. Download dataset
2. Open the live viewer
3. Click **Select File**
4. Load the `.ply` file

---

# 🛠 Local Development

### Requirements

```
Node.js 18+
```

### Install dependencies

```bash
npm install
```

### Run development server

```bash
npm run dev
```

### Build production version

```bash
npm run build
```

Production output:

```
dist/
```

---

# 📂 Project Structure

```
src/
 ├ main.js
 ├ styles.css

index.html
vite.config.js
```

---

# 🤝 Contributing

Contributions are welcome.

- Open an issue
- Submit a pull request
- Suggest improvements

---

# 📜 License

MIT License recommended.

---

# ⭐ Support

If you find this project useful:

⭐ Star the repository  
🔁 Share it with others
