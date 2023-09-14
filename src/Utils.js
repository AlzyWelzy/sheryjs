import * as THREE from "three"
import ControlKit from "controlkit"
import { ScrollPos } from "./Effects"

export const lerp = (x, y, a) => x * (1 - a) + y * a

export const clamp = (val, min = 1, max = 10) => Math.min(Math.max(val, min), max)

export const fix = () => {
  const s =
    "#controlKit .panel .group-list .group .sub-group-list .sub-group .wrap .wrap"
  const c = "#controlKit .panel .button, #controlKit .picker .button"
  if (document.querySelector(s))
    document.querySelectorAll(s).forEach((e) => (e.style.width = "30%"))
  if (document.querySelector(c)) {
    document.querySelector(c).parentElement.style.float = "none"
    document.querySelector(c).parentElement.style.width = "100% "
  }
  if (document.querySelector(s + ".color"))
    document.querySelector(s + ".color").parentElement.style.width = "60%"
}

export const redraw = (elemMesh, v) => {
  let newGeometry = new THREE.PlaneGeometry(
    elemMesh.geometry.parameters.width,
    elemMesh.geometry.parameters.height,
    v,
    v
  )
  elemMesh.geometry.dispose()
  elemMesh.geometry = newGeometry
}

var isdebug = []
export const init = (
  elem,
  vertex,
  fragment,
  uniforms,
  {
    camera,
    renderer,
    width,
    height,
    scene,
    geometry,
    opts,
    effect = 0,
    dposition = 1,
  } = {}
) => {
  let intersect = 0
  const o = "#controlKit .options"

  let elemWidth = elem.getBoundingClientRect().width
  let elemHeight = elem.getBoundingClientRect().height
  let elemLeft = elem.getBoundingClientRect().left

  const mouse = new THREE.Vector2()
  const mousem = new THREE.Vector2()

  const src = [elem.getAttribute("src") && elem.getAttribute("src")]
  let t = [elem.getAttribute("src") && new THREE.TextureLoader().load(src[0])]
  const doAction = newSection => {
    uniforms.uSection.value = newSection
    if (t.length > newSection) {
      if (t.length > newSection + 1)
        uniforms.uTexture.value = [t[newSection], t[newSection + 1]]
      else uniforms.uTexture.value = [t[t.length - 1], t[t.length - 1]]
    }
  }
  var mouseWheel = new ScrollPos()
  const staticScroll = () => {
    if (!(elem.nodeName.toLowerCase() === "img") && !opts.slideStyle) {
      mouseWheel.update()
      mouseWheel.dampen = .9 + clamp(opts.damping || 7, 0, 9) / 100
      mouseWheel.speed = Math.abs(opts.scrollSpeed || 6)
      mouseWheel.touchSpeed = Math.abs(opts.touchSpeed || 6)
      let scrollTarget = (Math.floor((mouseWheel.scrollPos + elemHeight * 0.5) / elemHeight)) * elemHeight
      if (opts.scrollSnapping) {
        mouseWheel.snap(scrollTarget)
      }
      let { scrollPos } = mouseWheel
      if (scrollPos < 0) { scrollPos = 0 }
      if (scrollPos > 0 && scrollPos < elemHeight * (t.length - 1)) setScroll(scrollPos / elemHeight)
    }
  }
  if (!(elem.nodeName.toLowerCase() === "img")) {
    fragment = fragment.replace(
      "!isMulti;",
      opts.gooey && !opts.slideStyle == true ? `vec2 pos=vec2(vuv.x,vuv.y/aspect);vec2 mouse=vec2(mousei.x*2.,(1.-mousei.y)/aspect);vec2 interpole = mix(vec2(0),vec2(metaball,noise_height),uIntercept);float noise=(snoise(vec3(pos*noise_scale,time*noise_speed))+1.)/2.;
      float val=noise*interpole.y;float u=distance(mouse,pos)/(interpole.x+.00001);float mouseMetaball=clamp(1.-max(5.*u,-25.*u*u+10.*u),0.,1.);val+=mouseMetaball;float alpha=smoothstep(discard_threshold-antialias_threshold,discard_threshold,val);
      gl_FragColor=vec4(mix(texture2D(uTexture[0],uv),texture2D(uTexture[1],uv),alpha));`:
        `float c = (sin((uv.x*7.0*snoise(vec3(uv,1.0)))+(time))/15.0*snoise(vec3(uv,1.0)))+.01;
      float blend=uScroll-uSection;float blend2=1.-blend;vec4 imageA=texture2D(uTexture[0],vec2(uv.x,uv.y-(((texture2D(uTexture[0],uv).r*displaceAmount)*blend)*2.)))*blend2;vec4 imageB=texture2D(uTexture[1],vec2(uv.x,uv.y+(((texture2D(uTexture[1],uv).r*displaceAmount)*blend2)*2.)))*blend;
      gl_FragColor =scrollType == 0.0? mix(texture2D(uTexture[1], uv), texture2D(uTexture[0], uv), step((uScroll)-uSection, sin(c) + uv.y)):imageA.bbra*blend+imageA*blend2+imageB.bbra*blend2+imageB*blend;`
    )
    for (let i = 0; i < elem.children.length; i++) {
      src[i] = elem.children[i].getAttribute("src")
      t[i] = new THREE.TextureLoader().load(src[i])
      if (i > 0) {
        elem.children[i].style.display = 'none'
      }
    }
  }
  Object.assign(uniforms, {
    aspect: {
      value: elemWidth / elemHeight
    },
    gooey: { value: opts.gooey ? true : false },
    time: { value: 0 },
    displaceAmount: { value: .5 },
    mousei: { value: new THREE.Vector2() },
    mouse: { value: mouse },
    scrollType: { value: 0 },
    uIntercept: { value: 0 },
    geoVertex: { range: [1, 64], value: uniforms.geoVertex ? uniforms.geoVertex.value : 1 },
    onMouse: { value: 0 },
    uSection: { value: 0 },
    isMulti: { value: !(elem.nodeName.toLowerCase() === "img") },
    uScroll: { value: 0 },
    noise_speed: { value: 0.2, range: [0, 10] },
    metaball: { value: 1, range: [0, 10] },
    discard_threshold: { value: 0.5, range: [0, 1] },
    antialias_threshold: { value: 0.002, range: [0, .1] },
    noise_height: { value: 0.5, range: [0, 5] },
    noise_scale: { value: 10, range: [0, 100] },
    uTexture: {
      value:
        elem.nodeName.toLowerCase() === "img"
          ? t
          : [t[0], t[1]],
    },
  })

  const setScroll = (x) => {
    if (x >= 0) {
      uniforms.uScroll.value = x
      doAction(Math.floor(x))
    }
  }

  if (opts.slideStyle && typeof opts.slideStyle === "function")
    opts.slideStyle(setScroll)

  const snoise = `vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}float snoise(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=mod289(i);vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}`

  const material = new THREE.ShaderMaterial({
    vertexShader: vertex.replace("#define SNOISEHOLDER", snoise),
    fragmentShader: fragment.replace("#define SNOISEHOLDER", snoise),
    uniforms,
  })

  const elemMesh = new THREE.Mesh(geometry, material)
  elemMesh.scale.set(elemWidth, elemHeight)
  redraw(elemMesh, uniforms.geoVertex.value)
  scene.add(elemMesh)

  var debugObj = {
    Mode: [
      "Off",
      "Reflect/Glow",
      "Exclusion",
      "Difference",
      "Darken",
      "ColorBurn",
      "ColorDoge",
      "SoftLight",
      "Overlay",
      "Phoenix",
      "Add",
      "Multiply",
      "Screen",
      "Negative",
      "Divide",
      "Substract",
      "Neon",
      "Natural",
      "Mod",
      "NeonNegative",
      "Dark",
      "Average",
    ],
    "Mode Active": "Soft Light",
    Trigo: ["Sin", "Cos", "Tan", "Atan"],
    "Trig A": "Cos",
    Trigo: ["Sin", "Cos", "Tan", "Atan"],
    "Trig A": "Cos",
    "Trig N": "Sin",
    Mouse: ["Off", "Mode 1", " Mode 2", " Mode 3"],
    onMouse: ["Always Active", "Active On Hover", "Deactivate On Hover"],
    Active: "Always Active",
    scrollType: ["Wave", "Morph"],
    Resolution_XY: {
      value: 1000,
      range: [0, 1000],
      precise: 1,
      rangep: [0, 100],

    },
    scrollTypeIs: 'Wave',
    "Mouse Active": "Off",
    Color: "#54A8FF",
    speed: { precise: 1, normal: 1, range: [-500, 500], rangep: [-10, 10] },
    frequency: {
      precise: 1,
      normal: 50,
      range: [-800, 800],
      rangep: [-50, 50],
    },
    Resolution_XY: {
      value: 1000,
      range: [0, 1000],
      precise: 1,
      rangep: [0, 100],

    },
    pixelStrength: {
      precise: 1,
      normal: 3,
      range: [-20, 100],
      rangep: [-20, 20],
    },
    strength: { precise: 1, normal: 0.2, range: [-40, 40], rangep: [-5, 5] },
    s: 0.6,
    range: [0.1, 1],
    f: 0.6,
    rangef: [1, 10],
  }

  var controlKit = null
  var panel = null

  const config = (c) => {
    if (c.color) c.color.value = new THREE.Color(c.color.value)
    Object.assign(uniforms, c)
  }

  if (opts.preset)
    fetch(opts.preset)
      .then((response) => response.json())
      .then((json) => config(json))
  if (opts.config) config(opts.config)

  if ((opts.debug && !isdebug[effect]) || false) {
    isdebug[effect] = true
    controlKit = new ControlKit()

    if (opts.gooey == true) {
      controlKit
        .addPanel({
          enable: false,
          label: "Gooey Panel",
          width: 250,
          fixed: false,
          position: [dposition + 300, 10],
        })
        .addSlider(uniforms.noise_speed, "value", "range", {
          label: "Speed",
          step: 0.001,
        })
        .addSlider(uniforms.metaball, "value", "range", {
          label: "GooeyBall",
          step: 0.001,
        })
        .addSlider(uniforms.discard_threshold, "value", "range", {
          label: "Threshold",
          step: 0.001,
        })
        .addSlider(uniforms.antialias_threshold, "value", "range", {
          label: "Antialias",
          step: 0.001,
        })
        .addSlider(uniforms.noise_height, "value", "range", {
          label: "Height",
          step: 0.001,
        })
        .addSlider(uniforms.noise_scale, "value", "range", {
          label: "Scale",
          step: 0.001,
        })

    }

    panel = controlKit
      .addPanel({
        enable: false,
        label: "Debug Panel",
        fixed: false,
        position: [dposition, 10],
        width: 280,
      })
      .addButton("Save To Clipboard", () => {
        const {
          uScroll,
          isMulti,
          uSection,
          time,
          resolution,
          uTexture,
          mouse,
          mousem,
          uIntercept,
          ...rest
        } = uniforms
        navigator.clipboard.writeText(JSON.stringify(rest))
      })
    if (!(elem.nodeName.toLowerCase() === "img") && opts.gooey != true)
      panel.addSelect(debugObj, "scrollType", {
        target: "scrollTypeIs",
        label: "Scroll Type",
        onChange: (x) => (uniforms.scrollType.value = x),
      })
  }

  function setMouseCord(e) {
    mouse.x = (e.offsetX / elemWidth) * 2 - 1
    mouse.y = -((e.offsetY / elemHeight) * 2 - 1)
  }

  function getNormalizedMousePosition(event) {
    const centerX = window.innerWidth / 2
    const centerY = window.innerHeight / 2
    const mouseX = event.clientX
    const mouseY = event.clientY

    const deltaX = mouseX - centerX
    const deltaY = mouseY - centerY

    const normalizedX = deltaX / centerX
    const normalizedY = deltaY / centerY

    mousem.x = normalizedX / 300
    mousem.y = normalizedY / 300
  }

  elem.addEventListener("mousemove", (e) => setMouseCord(e))

  document.addEventListener("mousemove", (e) => {
    getNormalizedMousePosition(e)
    uniforms.mousei.value.x = (e.clientX-elemLeft) / window.innerWidth
    uniforms.mousei.value.y = (e.clientY) / window.innerHeight
  })

  elem.addEventListener("mouseleave", (e) => {
    intersect = 0
    setMouseCord(e)
  })

  elem.addEventListener("mouseenter", (e) => {
    intersect = 1
    setMouseCord(e)
  })

  const fit = () => {
    width = innerWidth
    height = innerHeight

    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    camera.fov = 2 * Math.atan(height / 2 / 10) * (180 / Math.PI)

    camera.aspect = width / height
    camera.updateProjectionMatrix()

    elemLeft = elem.getBoundingClientRect().left
    elemWidth = elem.getBoundingClientRect().width
    elemHeight = elem.getBoundingClientRect().height

    elemMesh.scale.set(
      elem.getBoundingClientRect().width,
      elem.getBoundingClientRect().height
    )

    const size = new THREE.Vector3()
    new THREE.Box3().setFromObject(elemMesh).getSize(size)
    createCroppedTexture(src, size.x / size.y, t)
      .then((texture) => {
        texture.minFilter = THREE.LinearFilter
        texture.magFilter = THREE.LinearFilter
        elemMesh.material.uniforms.uTexture.value = texture
        t = texture
      })
      .catch((error) => {
        console.error("Error loading image:", error)
      })
    uniforms.aspect.value = elemWidth / elemHeight
  }


  function createCroppedTexture(imageUrls, newAspect, oldTextures = []) {
    return Promise.all(imageUrls.map((imageUrl, index) => {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.src = imageUrl
        img.onload = () => {
          const imgWidth = img.width
          const imgHeight = img.height

          let newWidth, newHeight
          let xOffset = 0
          let yOffset = 0

          if (imgWidth / imgHeight > newAspect) {
            newWidth = imgHeight * newAspect
            newHeight = imgHeight
            xOffset = (imgWidth - newWidth) / 2
          } else {
            newWidth = imgWidth
            newHeight = imgWidth / newAspect
            yOffset = (imgHeight - newHeight) / 2
          }

          const canvas = document.createElement("canvas")
          canvas.width = newWidth
          canvas.height = newHeight
          const ctx = canvas.getContext("2d")
          ctx.drawImage(
            img,
            xOffset,
            yOffset,
            newWidth,
            newHeight,
            0,
            0,
            newWidth,
            newHeight
          )

          if (oldTextures[index]) {
            oldTextures[index].dispose()
          }

          const newTexture = new THREE.Texture(canvas)
          newTexture.needsUpdate = true

          resolve(newTexture)
        }

        img.onerror = (error) => {
          reject(error)
        }
      })
    }))
  }

  fit()

  setTimeout(window.dispatchEvent(new Event('resize')), 0)
  addEventListener("resize", fit)

  const clock = new THREE.Clock()
  function animate() {
    if (!opts.slideStyle)
      if (opts.gooey != true)
        staticScroll()

    if (document.querySelector(o))
      if (parseInt(document.querySelector(o).style.top) < 0)
        document.querySelector(o).style.top = "0px"

    renderer.render(scene, camera)

    Object.assign(uniforms, {
      time: { value: clock.getElapsedTime() },
      mouse: { value: mouse },
      mousem: { value: mousem },

      uIntercept: {
        value: THREE.MathUtils.lerp(
          uniforms.uIntercept.value,
          intersect === 1 ? 1 : 0,
          0.07
        ),
      },
    })

    elemMesh.material.uniforms.time.value = clock.getElapsedTime()
    elemMesh.position.x = elemLeft - width / 2 + elemWidth / 2
    elemMesh.position.y = -elem.getBoundingClientRect().top + (height / 2) - (elemHeight / 2)

    requestAnimationFrame(animate)
  }
  return {
    material,
    debugObj,
    controlKit,
    panel,
    animate,
    elemMesh,
    uniforms: elemMesh.material.uniforms,
  }
}