import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { postsApi } from '../api';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { ErrorMessage, Spinner } from '../components/ui';

// Used for both "new post" (/posts/new) and "edit post" (/posts/:slug/edit).
export default function PostEditor() {
  const { slug } = useParams();
  const isEdit = Boolean(slug);
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { toast } = useNotifications();

  const [post, setPost] = useState(null);
  const [form, setForm] = useState({ title: '', content: '' });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isEdit) return undefined;
    let cancelled = false;
    postsApi
      .getBySlug(slug)
      .then(({ data }) => {
        if (cancelled) return;
        setPost(data);
        setForm({ title: data.title, content: data.content });
      })
      .catch((err) => !cancelled && setError(getErrorMessage(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [isEdit, slug]);

  const handleChange = (event) => setForm((f) => ({ ...f, [event.target.name]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { data } = isEdit ? await postsApi.update(post._id, form) : await postsApi.create(form);
      toast(isEdit ? 'Post updated' : 'Post published', 'success');
      navigate(`/posts/${data.slug}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  if (isEdit && post && !isAdmin && post.author?._id !== user._id) {
    return <ErrorMessage>You can only edit your own posts.</ErrorMessage>;
  }
  if (isEdit && !post) return <ErrorMessage>{error}</ErrorMessage>;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="page-title mb-6">{isEdit ? 'Edit post' : 'New post'}</h1>
      <form onSubmit={handleSubmit} className="card space-y-4">
        <ErrorMessage>{error}</ErrorMessage>
        <div>
          <label className="label" htmlFor="title">
            Title
          </label>
          <input id="title" name="title" className="input" value={form.title} onChange={handleChange} minLength={3} maxLength={150} required />
        </div>
        <div>
          <label className="label" htmlFor="content">
            Content
          </label>
          <textarea id="content" name="content" className="input" rows={14} value={form.content} onChange={handleChange} minLength={10} required />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Publish'}
          </button>
          <Link to={isEdit ? `/posts/${slug}` : '/'} className="btn">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
