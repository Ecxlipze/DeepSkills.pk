// Static-export (shared hosting) fallback shell. The root .htaccess rewrites
// /blogs/<slug> to /blogs/post/index.html for slugs published after the last
// build; the [slug] component then fetches the post client-side. Harmless on
// the Node deploy, where fallback:'blocking' serves every slug server-side.
// Note: a real post slugged "post" would be shadowed by this route.
import BlogPost from './[slug]';

export default BlogPost;

export async function getStaticProps() {
  return {
    props: {
      post: null,
      relatedPosts: [],
      relatedCourses: []
    }
  };
}
