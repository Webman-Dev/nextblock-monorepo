// app/cms/posts/new/page.tsx
import PostForm from "../components/PostForm";
import { createPost } from "../actions";
import { getLanguages } from "@/app/cms/settings/languages/actions";

export default async function NewPostPage() {
  const languagesResult = await getLanguages();
  const allLanguages = languagesResult.data || []; // Ensure it's an array

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create New Post</h1>
      <PostForm
        formAction={createPost}
        actionButtonText="Create Post"
        isEditing={false}
        availableLanguagesProp={allLanguages}
      />
    </div>
  );
}
