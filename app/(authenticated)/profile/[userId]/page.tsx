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

interface FollowUser {
  id: string
  username: string
  nickname?: string
  profileImage?: string
  image?: string
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
  const [followers, setFollowers] = useState<FollowUser[]>([])
  const [following, setFollowing] = useState<FollowUser[]>([])
  const [loading, setLoading] = useState(true)
  const [postsLoading, setPostsLoading] = useState(false)
  const [profileImageUploading, setProfileImageUploading] = useState(false)
  const [newPost, setNewPost] = useState("")
  const [isEditingAbout, setIsEditingAbout] = useState(false)
  const [editedAbout, setEditedAbout] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false)
  const [isFollowersDialogOpen, setIsFollowersDialogOpen] = useState(false)
  const [isFollowingDialogOpen, setIsFollowingDialogOpen] = useState(false)
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

        const postsResponse = await fetch(`/api/posts?userId=${targetUserId}?t=${Date.now()}`)
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

  const fetchFollowers = async (targetUserId: string) => {
    try {
      const response = await fetch(`/api/users/${targetUserId}/followers`)
      if (response.ok) {
        const data = await response.json()
        setFollowers(data.followers || [])
      }
    } catch (error) {
      console.error("Error fetching followers:", error)
    }
  }

  const fetchFollowing = async (targetUserId: string) => {
    try {
      const response = await fetch(`/api/users/${targetUserId}/following`)
      if (response.ok) {
        const data = await response.json()
        setFollowing(data.following || [])
      }
    } catch (error) {
      console.error("Error fetching following:", error)
    }
  }

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
          title: "Success",
          description: "Post created successfully!",
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
          title: "Success",
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
        const data = await response.json()
        setUser((prev) => (prev ? { ...prev, about: data.user?.about || editedAbout } : null))
        setIsEditingAbout(false)

        toast({
          title: "Success",
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
          title: "Success",
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
          title: "Success",
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
        router.push(`/messages/${user.id}`)
      } else {
        router.push(`/messages/${user.id}`)
      }
    } catch (error) {
      console.error("Error creating channel:", error)
      router.push(`/messages/${user.id}`)
    }
  }

  const handleRefreshPosts = async () => {
    const targetUserId = userId || session?.user?.id
    if (targetUserId) {
      await fetchPosts(targetUserId, true)
    }
  }

  const handleViewFollowers = async () => {
    const targetUserId = userId || session?.user?.id
    if (targetUserId) {
      await fetchFollowers(targetUserId)
      setIsFollowersDialogOpen(true)
    }
  }

  const handleViewFollowing = async () => {
    const targetUserId = userId || session?.user?.id
    if (targetUserId) {
      await fetchFollowing(targetUserId)
      setIsFollowingDialogOpen(true)
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
        return "bg-blue-100 text-blue-700"
      case "context":
        return "bg-green-100 text-green-700"
      case "intention":
        return "bg-purple-100 text-purple-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-600">User not found</h2>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Enhanced Mobile-Optimized Hero Section */}
      <div className="relative mb-6">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-blue-50 rounded-2xl sm:rounded-3xl"></div>

        {/* Content */}
        <div className="relative p-4 sm:p-6 lg:p-8">
          {/* Mobile: Stack profile picture and info vertically */}
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:gap-6 sm:text-left">
            {/* Profile Picture */}
            <div className="flex flex-col items-center mb-4 sm:mb-0 sm:flex-shrink-0">
              <div className="relative group">
                <div className="relative h-24 w-24 sm:h-28 sm:w-28 lg:h-32 lg:w-32 overflow-hidden rounded-full bg-gradient-to-br from-blue-400 to-blue-600 p-1 shadow-xl">
                  <div className="h-full w-full overflow-hidden rounded-full bg-white">
                    <Image
                      src={user.profileImage || user.image || "/placeholder.svg?height=150&width=150"}
                      alt={user.username}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 96px, (max-width: 1024px) 112px, 128px"
                    />
                  </div>
                </div>
                {isOwnProfile && (
                  <label
                    className={cn(
                      "absolute bottom-0 right-0 h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg cursor-pointer flex items-center justify-center transition-all",
                      profileImageUploading && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    {profileImageUploading ? (
                      <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                    ) : (
                      <Camera className="h-3 w-3 sm:h-4 sm:w-4" />
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
                <div className="mt-2 sm:mt-3">
                  <span className="text-lg sm:text-xl font-medium text-gray-900">{user.nickname}</span>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 w-full">
              <div className="flex flex-col items-center sm:items-start">
                <div className="mb-3 sm:mb-4">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1">{user.username}</h1>
                  {user.metro_area && (
                    <div className="flex items-center justify-center sm:justify-start gap-1 text-sm text-gray-500 mb-2">
                      <MapPin className="h-3 w-3" />
                      <span>{user.metro_area}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-center sm:justify-start gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600">
                    <button
                      onClick={handleViewFollowers}
                      className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                    >
                      <UserPlus className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="font-medium">{user.followers || 0}</span>
                      <span>followers</span>
                    </button>
                    <button
                      onClick={handleViewFollowing}
                      className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                    >
                      <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="font-medium">{user.following || 0}</span>
                      <span>following</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="font-medium">{user.visitors || 0}</span>
                      <span>views</span>
                    </div>
                  </div>
                </div>

                {/* Mobile-optimized Action Buttons */}
                {!isOwnProfile && (
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      onClick={handleFollowToggle}
                      className={cn(
                        "flex-1 sm:flex-none rounded-full px-4 sm:px-6 text-sm font-medium",
                        isFollowing
                          ? "bg-white border border-blue-200 text-blue-600 hover:bg-blue-50"
                          : "bg-blue-600 hover:bg-blue-700 text-white",
                      )}
                    >
                      {isFollowing ? (
                        <>
                          <Check className="h-4 w-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">Following</span>
                          <span className="sm:hidden">Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-1 sm:mr-2" />
                          Follow
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 sm:flex-none rounded-full border-blue-200 hover:bg-blue-50 text-blue-600 px-4 sm:px-6 text-sm"
                      onClick={handleMessage}
                    >
                      <MessageCircle className="h-4 w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Message</span>
                      <span className="sm:hidden">Chat</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* About Section - Full width on mobile */}
          <div className="mt-4 sm:mt-6">
            {isEditingAbout ? (
              <div className="space-y-3">
                <Textarea
                  value={editedAbout}
                  onChange={(e) => setEditedAbout(e.target.value)}
                  className="min-h-[80px] sm:min-h-[100px] rounded-xl sm:rounded-2xl border-blue-200 bg-white/80 backdrop-blur-sm resize-none text-sm sm:text-base"
                  placeholder="Tell us about yourself..."
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditingAbout(false)}
                    className="rounded-full px-4 text-sm"
                    size="sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveAbout}
                    className="rounded-full px-4 bg-blue-600 hover:bg-blue-700 text-sm"
                    size="sm"
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative group">
                <div className="rounded-xl sm:rounded-2xl bg-white/80 backdrop-blur-sm border border-blue-100 p-4 sm:p-6 shadow-sm">
                  <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
                    {user.about || "No bio available"}
                  </p>
                </div>
                {isOwnProfile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-blue-100 h-8 w-8 sm:h-10 sm:w-10"
                    onClick={() => setIsEditingAbout(true)}
                  >
                    <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Mobile-Optimized Tags Section */}
          {tags.length > 0 && (
            <div className="mt-4 sm:mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Tags</h3>
                {isOwnProfile && (
                  <Dialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full border-blue-200 hover:bg-blue-50 text-xs sm:text-sm px-3"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="mx-4 sm:mx-auto sm:max-w-[600px] bg-background max-h-[80vh] overflow-y-auto rounded-2xl">
                      <DialogHeader className="px-2 sm:px-0">
                        <DialogTitle className="text-blue-600 text-lg">Edit Your Tags</DialogTitle>
                        <DialogDescription className="text-sm">
                          Update your interests, context, and intentions to help others connect with you.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6 py-4 px-2 sm:px-0">
                        <div>
                          <h3 className="mb-2 text-base font-medium text-blue-600">Your Interests</h3>
                          <TagSelector
                            tags={availableTags}
                            selectedTags={interestTags}
                            onChange={setInterestTags}
                            maxSelections={5}
                            category="interest"
                          />
                        </div>

                        <div>
                          <h3 className="mb-2 text-base font-medium text-blue-600">Your Context</h3>
                          <TagSelector
                            tags={availableTags}
                            selectedTags={contextTags}
                            onChange={setContextTags}
                            maxSelections={3}
                            category="context"
                          />
                        </div>

                        <div>
                          <h3 className="mb-2 text-base font-medium text-blue-600">Your Intentions</h3>
                          <TagSelector
                            tags={availableTags}
                            selectedTags={intentionTags}
                            onChange={setIntentionTags}
                            maxSelections={3}
                            category="intention"
                          />
                        </div>
                      </div>
                      <DialogFooter className="flex-col gap-2 mt-4 px-2 sm:px-0 sm:flex-row">
                        <Button
                          variant="outline"
                          onClick={() => setIsTagDialogOpen(false)}
                          className="rounded-full w-full sm:w-auto"
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleSaveTags} className="rounded-full w-full sm:w-auto">
                          Save Changes
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag.tagId}
                    className={cn(
                      "rounded-full font-medium text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 transition-all hover:scale-105",
                      getTagColor(tag.tagCategory),
                    )}
                  >
                    {tag.tagName}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Followers Dialog */}
      <Dialog open={isFollowersDialogOpen} onOpenChange={setIsFollowersDialogOpen}>
        <DialogContent className="mx-4 sm:mx-auto sm:max-w-[400px] max-h-[80vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-blue-600">Followers</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {followers.length > 0 ? (
              followers.map((follower) => (
                <div key={follower.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                  <div className="relative h-10 w-10 overflow-hidden rounded-full">
                    <Image
                      src={follower.profileImage || follower.image || "/placeholder.svg?height=40&width=40"}
                      alt={follower.username}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{follower.nickname || follower.username}</div>
                    {follower.nickname && <div className="text-sm text-gray-500">@{follower.username}</div>}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/profile/${follower.id}`)}
                    className="rounded-full"
                  >
                    View
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">No followers yet</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Following Dialog */}
      <Dialog open={isFollowingDialogOpen} onOpenChange={setIsFollowingDialogOpen}>
        <DialogContent className="mx-4 sm:mx-auto sm:max-w-[400px] max-h-[80vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-blue-600">Following</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {following.length > 0 ? (
              following.map((followedUser) => (
                <div key={followedUser.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                  <div className="relative h-10 w-10 overflow-hidden rounded-full">
                    <Image
                      src={followedUser.profileImage || followedUser.image || "/placeholder.svg?height=40&width=40"}
                      alt={followedUser.username}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{followedUser.nickname || followedUser.username}</div>
                    {followedUser.nickname && <div className="text-sm text-gray-500">@{followedUser.username}</div>}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/profile/${followedUser.id}`)}
                    className="rounded-full"
                  >
                    View
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">Not following anyone yet</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile-Optimized Content Tabs */}
      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="grid w-full grid-cols-1 rounded-xl sm:rounded-2xl bg-blue-50 p-1 mb-6">
          <TabsTrigger
            value="posts"
            className="rounded-lg sm:rounded-xl data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm font-medium text-sm sm:text-base py-2"
          >
            Posts
            {postsLoading && <div className="ml-2 animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4 sm:space-y-6">
          {/* Refresh button for posts */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              {isOwnProfile ? "Your Posts" : `${user.username}'s Posts`}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshPosts}
              disabled={postsLoading}
              className="rounded-full"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", postsLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>

          {/* Mobile-Optimized Post Creation Widget */}
          {isOwnProfile && (
            <Card className="rounded-xl sm:rounded-2xl border-blue-100 shadow-sm bg-gradient-to-br from-white to-blue-50/30">
              <CardContent className="p-4 sm:p-6">
                <div className="flex gap-3 sm:gap-4">
                  <div className="relative h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 overflow-hidden rounded-full">
                    <Image
                      src={user.profileImage || user.image || "/placeholder.svg?height=48&width=48"}
                      alt={user.username}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 40px, 48px"
                    />
                  </div>
                  <div className="flex-1 space-y-3 sm:space-y-4">
                    <div className="relative">
                      <Textarea
                        placeholder={`What's on your mind, ${user.nickname || user.username}?`}
                        value={newPost}
                        onChange={(e) => setNewPost(e.target.value)}
                        className="min-h-[100px] sm:min-h-[120px] rounded-xl sm:rounded-2xl border-blue-200 bg-white/80 backdrop-blur-sm resize-none text-sm sm:text-lg placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-400/20"
                      />
                      <div className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3 flex items-center gap-2">
                        <span className="text-xs text-gray-400">{newPost.length}/500</span>
                      </div>
                    </div>

                    {imagePreview && (
                      <div className="relative rounded-xl sm:rounded-2xl overflow-hidden">
                        <Image
                          src={imagePreview || "/placeholder.svg"}
                          alt="Post preview"
                          width={400}
                          height={300}
                          className="w-full object-cover max-h-48 sm:max-h-64"
                        />
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute top-2 right-2 h-7 w-7 sm:h-8 sm:w-8 rounded-full text-lg"
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
                      <div className="flex items-center gap-1 sm:gap-2">
                        <ImageUpload onImageChange={handleImageChange} imagePreview={imagePreview} />
                        <Button variant="ghost" size="sm" className="rounded-full hover:bg-blue-100 px-2 sm:px-3">
                          <Smile className="h-4 w-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline text-sm">Emoji</span>
                        </Button>
                      </div>
                      <Button
                        onClick={handlePostSubmit}
                        disabled={!newPost.trim() && !imagePreview}
                        className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        <Send className="h-4 w-4 mr-1 sm:mr-2" />
                        Share
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mobile-Optimized Posts */}
          <div className="space-y-4 sm:space-y-6">
            {posts.length > 0 ? (
              posts.map((post) => (
                <Card
                  key={post.id}
                  className="rounded-xl sm:rounded-2xl border-blue-100 shadow-sm hover:shadow-md transition-all bg-white"
                >
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex gap-3 sm:gap-4">
                      <div className="relative h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 overflow-hidden rounded-full">
                        <Image
                          src={user.profileImage || user.image || "/placeholder.svg?height=48&width=48"}
                          alt={user.username}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 40px, 48px"
                        />
                      </div>
                      <div className="flex-1 space-y-3 sm:space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                                {user.nickname || user.username}
                              </h3>
                              <span className="text-xs sm:text-sm text-gray-500">@{user.username}</span>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1">{formatDate(post.createdAt)}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-gray-100 flex-shrink-0"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>

                        <p className="text-gray-800 leading-relaxed text-sm sm:text-base">{post.content}</p>

                        {post.image && (
                          <div className="rounded-xl sm:rounded-2xl overflow-hidden -mx-1 sm:mx-0">
                            <Image
                              src={post.image || "/placeholder.svg"}
                              alt="Post image"
                              width={500}
                              height={300}
                              className="w-full object-cover max-h-64 sm:max-h-80"
                            />
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-4 sm:gap-6">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleLikePost(post.id)}
                              className={cn(
                                "flex items-center gap-1.5 sm:gap-2 rounded-full transition-colors px-2 sm:px-3 py-1.5 sm:py-2 -ml-2 sm:-ml-3",
                                post.isLiked ? "text-red-600 hover:bg-red-50" : "hover:bg-red-50 hover:text-red-600",
                              )}
                            >
                              <Heart className={cn("h-4 w-4 sm:h-5 sm:w-5", post.isLiked && "fill-current")} />
                              <span className="font-medium text-sm">{post.likes}</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex items-center gap-1.5 sm:gap-2 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors px-2 sm:px-3 py-1.5 sm:py-2"
                            >
                              <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                              <span className="font-medium text-sm">{post.comments}</span>
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors p-1.5 sm:p-2"
                          >
                            <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 sm:py-12 text-gray-500">
                <div className="text-sm sm:text-base">
                  {isOwnProfile ? "You haven't posted anything yet." : "No posts to show."}
                </div>
                {isOwnProfile && (
                  <p className="text-xs sm:text-sm mt-2 text-gray-400">Share your first post to get started!</p>
                )}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
