"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Edit,
  Send,
  Heart,
  MessageCircle,
  Share2,
  Users,
  UserPlus,
  Camera,
  Smile,
  Check,
  Eye,
  MoreHorizontal,
  RefreshCw,
  Sparkles,
  MapPin,
} from "lucide-react"
import { ImageUpload } from "@/components/image-upload"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { TagSelector, type Tag as TagSelectorTag } from "@/components/tag-selector"
import { toast } from "@/hooks/use-toast"

interface Post {
  id: number
  content: string
  createdAt: string
  image: string | null
  likes: number
  comments: number
  isLiked?: boolean
}

interface ProfileUser {
  id: string
  username: string
  nickname?: string
  metro_area?: string
  followers?: number
  following?: number
  visitors?: number
  profileImage?: string
  about?: string
  image?: string
}

interface Tag {
  tagId: number
  tagName: string
  tagCategory: string
}

export default function ProfilePage() {
  const params = useParams()
  const { data: session } = useSession()
  const router = useRouter()
  const userId = params?.userId as string
  const isOwnProfile = !userId || userId === session?.user?.id

  const [user, setUser] = useState<ProfileUser | null>(null)
  const [tags, setTags] = useState<Tag[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [postsLoading, setPostsLoading] = useState(false)
  const [profileImageUploading, setProfileImageUploading] = useState(false)
  const [newPost, setNewPost] = useState("")
  const [isEditingAbout, setIsEditingAbout] = useState(false)
  const [editedAbout, setEditedAbout] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [userTags, setUserTags] = useState<string[]>([])

  const [availableTags, setAvailableTags] = useState<TagSelectorTag[]>([])
  const [interestTags, setInterestTags] = useState<string[]>([])
  const [contextTags, setContextTags] = useState<string[]>([])
  const [intentionTags, setIntentionTags] = useState<string[]>([])

  const cacheKey = `posts-${userId || session?.user?.id}`

  // Fetch available tags from database
  useEffect(() => {
    const fetchAvailableTags = async () => {
      try {
        const response = await fetch("/api/tags")
        if (response.ok) {
          const data = await response.json()
          const formattedTags: TagSelectorTag[] = data.tags.map((tag: any) => ({
            id: tag.id.toString(),
            name: tag.name,
            category: tag.category,
            color: getTagColor(tag.category),
          }))
          setAvailableTags(formattedTags)
        }
      } catch (error) {
        console.error("Error fetching available tags:", error)
      }
    }

    fetchAvailableTags()
  }, [])

  const fetchPosts = useCallback(
    async (targetUserId: string, forceRefresh = false) => {
      try {
        setPostsLoading(true)

        if (!forceRefresh) {
          const cachedPosts = sessionStorage.getItem(cacheKey)
          if (cachedPosts) {
            const parsed = JSON.parse(cachedPosts)
            if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
              setPosts(parsed.data)
              setPostsLoading(false)
              return
            }
          }
        }

        const postsResponse = await fetch(`/api/posts/user/${targetUserId}?t=${Date.now()}`)
        if (postsResponse.ok) {
          const postsData = await postsResponse.json()
          const newPosts = postsData.posts || []
          setPosts(newPosts)

          sessionStorage.setItem(
            cacheKey,
            JSON.stringify({
              data: newPosts,
              timestamp: Date.now(),
            }),
          )
        } else {
          throw new Error("Failed to fetch posts")
        }
      } catch (error) {
        console.error("Error fetching posts:", error)
        toast({
          title: "Error",
          description: "Failed to load posts. Please try again.",
          variant: "destructive",
        })
      } finally {
        setPostsLoading(false)
      }
    },
    [cacheKey],
  )

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true)
        const targetUserId = userId || session?.user?.id

        if (!targetUserId) return

        const response = await fetch(`/api/users/profile/${targetUserId}`)
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
          setTags(data.tags || [])
          setEditedAbout(data.user.about || "")

          const tagIds = data.tags?.map((tag: Tag) => tag.tagId.toString()) || []
          setUserTags(tagIds)

          setInterestTags(
            tagIds.filter((tagId: string) => {
              const tag = data.tags?.find((t: Tag) => t.tagId.toString() === tagId)
              return tag?.tagCategory === "interest"
            }),
          )

          setContextTags(
            tagIds.filter((tagId: string) => {
              const tag = data.tags?.find((t: Tag) => t.tagId.toString() === tagId)
              return tag?.tagCategory === "context"
            }),
          )

          setIntentionTags(
            tagIds.filter((tagId: string) => {
              const tag = data.tags?.find((t: Tag) => t.tagId.toString() === tagId)
              return tag?.tagCategory === "intention"
            }),
          )
        }

        await fetchPosts(targetUserId)

        if (!isOwnProfile) {
          const followResponse = await fetch(`/api/users/${targetUserId}/follow-status`)
          if (followResponse.ok) {
            const followData = await followResponse.json()
            setIsFollowing(followData.isFollowing)
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error)
        toast({
          title: "Error",
          description: "Failed to load profile. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    if (session) {
      fetchProfile()
    }
  }, [userId, session, isOwnProfile, fetchPosts])

  useEffect(() => {
    return () => {
      const currentCacheKey = `posts-${userId || session?.user?.id}`
      if (currentCacheKey !== cacheKey) {
        sessionStorage.removeItem(currentCacheKey)
      }
    }
  }, [userId, session?.user?.id, cacheKey])

  const handlePostSubmit = async () => {
    if (!newPost.trim() && !imagePreview) return

    try {
      const formData = new FormData()
      formData.append("content", newPost)
      if (imageFile) {
        formData.append("image", imageFile)
      }

      const response = await fetch("/api/posts", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const newPostData = await response.json()
        const updatedPosts = [newPostData, ...posts]
        setPosts(updatedPosts)

        sessionStorage.setItem(
          cacheKey,
          JSON.stringify({
            data: updatedPosts,
            timestamp: Date.now(),
          }),
        )

        setNewPost("")
        setImageFile(null)
        setImagePreview(null)

        toast({
          title: "✨ Success",
          description: "Your post has been shared!",
        })
      } else {
        throw new Error("Failed to create post")
      }
    } catch (error) {
      console.error("Error creating post:", error)
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleLikePost = async (postId: number) => {
    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
      })

      if (response.ok) {
        const updatedPost = await response.json()
        const updatedPosts = posts.map((post) =>
          post.id === postId ? { ...post, likes: updatedPost.likes, isLiked: updatedPost.isLiked } : post,
        )
        setPosts(updatedPosts)

        sessionStorage.setItem(
          cacheKey,
          JSON.stringify({
            data: updatedPosts,
            timestamp: Date.now(),
          }),
        )
      }
    } catch (error) {
      console.error("Error liking post:", error)
      toast({
        title: "Error",
        description: "Failed to like post. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleImageChange = (file: File | null) => {
    setImageFile(file)
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setImagePreview(null)
    }
  }

  const handleProfileImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Please select a valid image file.",
        variant: "destructive",
      })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image size must be less than 5MB.",
        variant: "destructive",
      })
      return
    }

    try {
      setProfileImageUploading(true)

      const formData = new FormData()
      formData.append("profileImage", file)

      const response = await fetch("/api/users/profile-image", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()

        setUser((prev) =>
          prev
            ? {
                ...prev,
                profileImage: data.imageUrl,
                image: data.imageUrl,
              }
            : null,
        )

        const profileCacheKeys = Object.keys(sessionStorage).filter(
          (key) => key.startsWith("profile-") || key.startsWith("posts-"),
        )
        profileCacheKeys.forEach((key) => sessionStorage.removeItem(key))

        toast({
          title: "✨ Success",
          description: "Profile picture updated successfully!",
        })
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to upload image")
      }
    } catch (error) {
      console.error("Error uploading profile image:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload profile picture. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProfileImageUploading(false)
      event.target.value = ""
    }
  }

  const handleSaveAbout = async () => {
    try {
      const response = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          about: editedAbout,
        }),
      })

      if (response.ok) {
        const updatedUser = await response.json()
        setUser((prev) => (prev ? { ...prev, about: updatedUser.about } : null))
        setIsEditingAbout(false)

        toast({
          title: "✨ Success",
          description: "About section updated successfully!",
        })
      } else {
        throw new Error("Failed to update about section")
      }
    } catch (error) {
      console.error("Error updating about:", error)
      toast({
        title: "Error",
        description: "Failed to update about section. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSaveTags = async () => {
    try {
      const allTags = [...interestTags, ...contextTags, ...intentionTags]

      const response = await fetch("/api/users/tags", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tagIds: allTags.map((id) => Number.parseInt(id)),
        }),
      })

      if (response.ok) {
        const updatedTags = await response.json()
        setTags(updatedTags.tags)
        setUserTags(allTags)
        setIsTagDialogOpen(false)

        toast({
          title: "✨ Success",
          description: "Tags updated successfully!",
        })
      } else {
        throw new Error("Failed to update tags")
      }
    } catch (error) {
      console.error("Error updating tags:", error)
      toast({
        title: "Error",
        description: "Failed to update tags. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleFollowToggle = async () => {
    if (!user || isOwnProfile) return

    try {
      const response = await fetch(`/api/users/${user.id}/follow`, {
        method: isFollowing ? "DELETE" : "POST",
      })

      if (response.ok) {
        setIsFollowing(!isFollowing)
        setUser((prev) =>
          prev
            ? {
                ...prev,
                followers: (prev.followers || 0) + (isFollowing ? -1 : 1),
              }
            : null,
        )

        toast({
          title: "✨ Success",
          description: isFollowing ? "Unfollowed successfully!" : "Following successfully!",
        })
      } else {
        throw new Error("Failed to toggle follow status")
      }
    } catch (error) {
      console.error("Error toggling follow:", error)
      toast({
        title: "Error",
        description: "Failed to update follow status. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleMessage = async () => {
    if (!user || isOwnProfile) return

    try {
      const response = await fetch("/api/stream/channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: user.id }),
      })

      if (response.ok) {
        const data = await response.json()
        router.push(`/authenticated/messages?channelId=${data.channelId || user.id}`)
      } else {
        router.push(`/authenticated/messages?userId=${user.id}`)
      }
    } catch (error) {
      console.error("Error creating channel:", error)
      router.push(`/authenticated/messages?userId=${user.id}`)
    }
  }

  const handleRefreshPosts = async () => {
    const targetUserId = userId || session?.user?.id
    if (targetUserId) {
      await fetchPosts(targetUserId, true)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getTagColor = (category: string) => {
    switch (category) {
      case "interest":
        return "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200"
      case "context":
        return "bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 border-emerald-200"
      case "intention":
        return "bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border-purple-200"
      default:
        return "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border-gray-200"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="flex justify-center items-center py-32">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200"></div>
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent absolute top-0"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <Users className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">User not found</h2>
          <p className="text-gray-600">The profile you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Gorgeous Hero Section */}
        <div className="relative mb-8 overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 opacity-90"></div>
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-400/20 via-transparent to-purple-400/20"></div>

          {/* Floating elements */}
          <div className="absolute top-4 right-4 w-20 h-20 bg-white/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute bottom-6 left-6 w-16 h-16 bg-pink-300/20 rounded-full blur-lg animate-bounce"></div>

          {/* Content */}
          <div className="relative p-6 sm:p-8 lg:p-12">
            <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:gap-8 sm:text-left">
              {/* Profile Picture */}
              <div className="flex flex-col items-center mb-6 sm:mb-0 sm:flex-shrink-0">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                  <div className="relative h-28 w-28 sm:h-32 sm:w-32 lg:h-36 lg:w-36 overflow-hidden rounded-full bg-white p-1 shadow-2xl">
                    <div className="h-full w-full overflow-hidden rounded-full">
                      <Image
                        src={user.profileImage || user.image || "/placeholder.svg?height=150&width=150"}
                        alt={user.username}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-110"
                        sizes="(max-width: 640px) 112px, (max-width: 1024px) 128px, 144px"
                      />
                    </div>
                  </div>
                  {isOwnProfile && (
                    <label
                      className={cn(
                        "absolute bottom-1 right-1 h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg cursor-pointer flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-xl",
                        profileImageUploading && "opacity-50 cursor-not-allowed",
                      )}
                    >
                      {profileImageUploading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfileImageChange}
                        className="hidden"
                        disabled={profileImageUploading}
                      />
                    </label>
                  )}
                </div>
                {user.nickname && (
                  <div className="mt-4">
                    <span className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">{user.nickname}</span>
                  </div>
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1 w-full">
                <div className="flex flex-col items-center sm:items-start">
                  <div className="mb-6">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 drop-shadow-lg">
                      {user.username}
                    </h1>
                    {user.metro_area && (
                      <div className="flex items-center justify-center sm:justify-start gap-2 text-white/90 mb-4">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm font-medium">{user.metro_area}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-center sm:justify-start gap-6 text-white/90">
                      <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
                        <UserPlus className="h-4 w-4" />
                        <span className="font-semibold">{user.followers || 0}</span>
                        <span className="text-xs">followers</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
                        <Users className="h-4 w-4" />
                        <span className="font-semibold">{user.following || 0}</span>
                        <span className="text-xs">following</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
                        <Eye className="h-4 w-4" />
                        <span className="font-semibold">{user.visitors || 0}</span>
                        <span className="text-xs">views</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {!isOwnProfile && (
                    <div className="flex gap-3 w-full sm:w-auto">
                      <Button
                        onClick={handleFollowToggle}
                        className={cn(
                          "flex-1 sm:flex-none rounded-full px-6 py-3 font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl",
                          isFollowing
                            ? "bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30"
                            : "bg-white text-indigo-600 hover:bg-gray-50 shadow-lg",
                        )}
                      >
                        {isFollowing ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Following
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Follow
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 sm:flex-none rounded-full bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30 px-6 py-3 font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl"
                        onClick={handleMessage}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Message
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="mb-8">
          {isEditingAbout ? (
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm rounded-3xl overflow-hidden">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Textarea
                    value={editedAbout}
                    onChange={(e) => setEditedAbout(e.target.value)}
                    className="min-h-[120px] rounded-2xl border-indigo-200 bg-white/50 backdrop-blur-sm resize-none text-base focus:border-indigo-400 focus:ring-indigo-400/20"
                    placeholder="Tell us about yourself..."
                  />
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditingAbout(false)}
                      className="rounded-full px-6 border-gray-300 hover:bg-gray-50"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveAbout}
                      className="rounded-full px-6 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="relative group">
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-indigo-500" />
                        About
                      </h3>
                      <p className="text-gray-700 leading-relaxed text-base">
                        {user.about || "No bio available yet. This is where your story begins! ✨"}
                      </p>
                    </div>
                    {isOwnProfile && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-full hover:bg-indigo-100 hover:text-indigo-600 ml-4"
                        onClick={() => setIsEditingAbout(true)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Tags Section */}
        {tags.length > 0 && (
          <div className="mb-8">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm rounded-3xl overflow-hidden">
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-indigo-500" />
                    Tags
                  </h3>
                  {isOwnProfile && (
                    <Dialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 text-indigo-600 px-4 transition-all duration-300"
                        >
                          <Edit className="h-3 w-3 mr-2" />
                          Edit Tags
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="mx-4 sm:mx-auto sm:max-w-[600px] bg-white/95 backdrop-blur-sm max-h-[80vh] overflow-y-auto rounded-3xl border-0 shadow-2xl">
                        <DialogHeader className="px-2 sm:px-0">
                          <DialogTitle className="text-indigo-600 text-xl flex items-center gap-2">
                            <Sparkles className="h-5 w-5" />
                            Edit Your Tags
                          </DialogTitle>
                          <DialogDescription className="text-gray-600">
                            Update your interests, context, and intentions to help others connect with you.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 py-4 px-2 sm:px-0">
                          <div>
                            <h3 className="mb-3 text-base font-semibold text-indigo-600">Your Interests</h3>
                            <TagSelector
                              tags={availableTags}
                              selectedTags={interestTags}
                              onChange={setInterestTags}
                              maxSelections={5}
                              category="interest"
                            />
                          </div>

                          <div>
                            <h3 className="mb-3 text-base font-semibold text-emerald-600">Your Context</h3>
                            <TagSelector
                              tags={availableTags}
                              selectedTags={contextTags}
                              onChange={setContextTags}
                              maxSelections={3}
                              category="context"
                            />
                          </div>

                          <div>
                            <h3 className="mb-3 text-base font-semibold text-purple-600">Your Intentions</h3>
                            <TagSelector
                              tags={availableTags}
                              selectedTags={intentionTags}
                              onChange={setIntentionTags}
                              maxSelections={3}
                              category="intention"
                            />
                          </div>
                        </div>
                        <DialogFooter className="flex-col gap-3 mt-6 px-2 sm:px-0 sm:flex-row">
                          <Button
                            variant="outline"
                            onClick={() => setIsTagDialogOpen(false)}
                            className="rounded-full w-full sm:w-auto border-gray-300 hover:bg-gray-50"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSaveTags}
                            className="rounded-full w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                          >
                            <Sparkles className="h-4 w-4 mr-2" />
                            Save Changes
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  {tags.map((tag) => (
                    <span
                      key={tag.tagId}
                      className={cn(
                        "rounded-full font-medium text-sm px-4 py-2 transition-all duration-300 hover:scale-105 hover:shadow-md border",
                        getTagColor(tag.tagCategory),
                      )}
                    >
                      {tag.tagName}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Content Tabs */}
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-1 rounded-2xl bg-white/80 backdrop-blur-sm p-1 mb-8 shadow-lg border-0">
            <TabsTrigger
              value="posts"
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg font-semibold text-base py-3 transition-all duration-300"
            >
              <div className="flex items-center gap-2">
                Posts
                {postsLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                )}
              </div>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="space-y-6">
            {/* Posts Header */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-500" />
                {isOwnProfile ? "Your Posts" : `${user.username}'s Posts`}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshPosts}
                disabled={postsLoading}
                className="rounded-full border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 text-indigo-600 transition-all duration-300"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", postsLoading && "animate-spin")} />
                Refresh
              </Button>
            </div>

            {/* Post Creation */}
            {isOwnProfile && (
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm rounded-3xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full">
                      <Image
                        src={user.profileImage || user.image || "/placeholder.svg?height=48&width=48"}
                        alt={user.username}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="relative">
                        <Textarea
                          placeholder={`What's on your mind, ${user.nickname || user.username}? ✨`}
                          value={newPost}
                          onChange={(e) => setNewPost(e.target.value)}
                          className="min-h-[120px] rounded-2xl border-indigo-200 bg-white/50 backdrop-blur-sm resize-none text-base placeholder:text-gray-400 focus:border-indigo-400 focus:ring-indigo-400/20"
                        />
                        <div className="absolute bottom-3 right-3 flex items-center gap-2">
                          <span className="text-xs text-gray-400">{newPost.length}/500</span>
                        </div>
                      </div>

                      {imagePreview && (
                        <div className="relative rounded-2xl overflow-hidden">
                          <Image
                            src={imagePreview || "/placeholder.svg"}
                            alt="Post preview"
                            width={400}
                            height={300}
                            className="w-full object-cover max-h-64"
                          />
                          <Button
                            size="icon"
                            variant="destructive"
                            className="absolute top-3 right-3 h-8 w-8 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                            onClick={() => {
                              setImagePreview(null)
                              setImageFile(null)
                            }}
                          >
                            ×
                          </Button>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ImageUpload onImageChange={handleImageChange} imagePreview={imagePreview} />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-full hover:bg-indigo-100 hover:text-indigo-600 px-3"
                          >
                            <Smile className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline text-sm">Emoji</span>
                          </Button>
                        </div>
                        <Button
                          onClick={handlePostSubmit}
                          disabled={!newPost.trim() && !imagePreview}
                          className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-2 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Share
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Posts */}
            <div className="space-y-6">
              {posts.length > 0 ? (
                posts.map((post) => (
                  <Card
                    key={post.id}
                    className="border-0 shadow-xl bg-white/80 backdrop-blur-sm rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]"
                  >
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full">
                          <Image
                            src={user.profileImage || user.image || "/placeholder.svg?height=48&width=48"}
                            alt={user.username}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        </div>
                        <div className="flex-1 space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-gray-900 text-base">{user.nickname || user.username}</h3>
                                <span className="text-sm text-gray-500">@{user.username}</span>
                              </div>
                              <p className="text-sm text-gray-500 mt-1">{formatDate(post.createdAt)}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full hover:bg-gray-100 flex-shrink-0"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>

                          <p className="text-gray-800 leading-relaxed text-base">{post.content}</p>

                          {post.image && (
                            <div className="rounded-2xl overflow-hidden">
                              <Image
                                src={post.image || "/placeholder.svg"}
                                alt="Post image"
                                width={500}
                                height={300}
                                className="w-full object-cover max-h-80"
                              />
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                            <div className="flex items-center gap-6">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleLikePost(post.id)}
                                className={cn(
                                  "flex items-center gap-2 rounded-full transition-all duration-300 px-3 py-2 hover:scale-105",
                                  post.isLiked ? "text-red-500 hover:bg-red-50" : "hover:bg-red-50 hover:text-red-500",
                                )}
                              >
                                <Heart className={cn("h-5 w-5", post.isLiked && "fill-current")} />
                                <span className="font-semibold">{post.likes}</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="flex items-center gap-2 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-all duration-300 px-3 py-2 hover:scale-105"
                              >
                                <MessageCircle className="h-5 w-5" />
                                <span className="font-semibold">{post.comments}</span>
                              </Button>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-full hover:bg-indigo-50 hover:text-indigo-600 transition-all duration-300 p-2 hover:scale-105"
                            >
                              <Share2 className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm rounded-3xl overflow-hidden">
                  <CardContent className="p-12 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-indigo-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      {isOwnProfile ? "Share your first post!" : "No posts yet"}
                    </h3>
                    <p className="text-gray-600">
                      {isOwnProfile
                        ? "Start sharing your thoughts and connect with others! ✨"
                        : "This user hasn't shared anything yet."}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
