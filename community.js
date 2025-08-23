// Community with Auth + optional Cloudinary upload (unsigned)
const postsEl = document.getElementById('posts');
const postBtn = document.getElementById('postBtn');
const authorInput = document.getElementById('author');
const bodyInput = document.getElementById('body');
const imageInput = document.getElementById('imageInput');
const uploadBtn = document.getElementById('uploadBtn');
const imageUrlInput = document.getElementById('imageUrl');
const cloudName = document.getElementById('cloudName')?.value || '';
const uploadPreset = document.getElementById('uploadPreset')?.value || '';

async function fetchPosts(){
  const res = await fetch('/api/posts');
  const data = await res.json();
  return data.posts || [];
}

function h(tag, cls, html){
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

function renderPosts(posts){
  postsEl.innerHTML = '';
  if (!posts.length){
    postsEl.appendChild(h('p','muted','No posts yet. Be the first!'));
    return;
  }
  posts.forEach(p => {
    const wrap = h('article','post');
    wrap.appendChild(h('div','meta', new Date(p.createdAt).toLocaleString()));
    const author = h('div','', ''); author.style.fontWeight = '600'; author.textContent = p.author || 'Anonymous';
    wrap.appendChild(author);
    if (p.imageUrl){
      const img = document.createElement('img');
      img.src = p.imageUrl; img.alt = 'post image';
      img.style.maxWidth = '100%'; img.style.borderRadius = '0.8rem'; img.style.margin = '0.5rem 0';
      wrap.appendChild(img);
    }
    if (p.body) wrap.appendChild(h('p','', p.body));

    const comments = h('div','comments');
    if (!p.comments?.length){
      comments.appendChild(h('div','meta','No comments yet.'));
    } else {
      p.comments.forEach(c => {
        comments.appendChild(h('div','comment',
          `<strong>${c.author || 'Anonymous'}:</strong> ${c.body} <span class="meta">· ${new Date(c.createdAt).toLocaleString()}</span>`
        ));
      });
    }
    postsEl.appendChild(wrap);
  });
}

async function doUpload(){
  if (!cloudName || !uploadPreset) return alert('Cloudinary env not set.');
  const file = imageInput.files?.[0];
  if (!file) return alert('Choose an image first.');
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', uploadPreset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method:'POST', body: fd });
  const data = await res.json();
  if (data.secure_url){
    imageUrlInput.value = data.secure_url;
    uploadBtn.textContent = 'Image Added';
  } else {
    alert('Upload failed');
  }
}

async function submitPost(){
  const author = (authorInput.value || '').trim();
  const body = (bodyInput.value || '').trim();
  const imageUrl = (imageUrlInput.value || '').trim();
  if (!body && !imageUrl) return alert('Write something or add an image.');
  postBtn.disabled = true;
  try{
    await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author, body, imageUrl })
    });
    authorInput.value = ''; bodyInput.value = ''; imageUrlInput.value = ''; uploadBtn.textContent = 'Add Image';
    renderPosts(await fetchPosts());
  } finally {
    postBtn.disabled = false;
  }
}

uploadBtn?.addEventListener('click', doUpload);
postBtn?.addEventListener('click', submitPost);

(async function init(){
  renderPosts(await fetchPosts());
})();
