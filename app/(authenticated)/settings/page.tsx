"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { Bell, LogOut, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AgeRangeSelector } from "@/components/age-range-selector"
import { GENDER_PREFERENCES, PROXIMITY_OPTIONS } from "@/lib/constants"
import { useToast } from "@/components/ui/use-toast"

interface UserPreferences {
  genderPreference: string
  preferredAgeMin: number
  preferredAgeMax: number
  proximity: string
}

export default function SettingsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { toast } = useToast()

  // While we fetch the user’s saved preferences, show a spinner
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Preferences start as null so we know when they’re loaded
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)

  // Constants matching the backend’s allowed age bounds
  const SERVER_MIN_AGE = 13
  const SERVER_MAX_AGE = 100 // Adjust if your backend has a different upper bound

  // 1) On mount, if the user is authenticated, load their saved prefs
  useEffect(() => {
    if (session?.user?.id) {
      loadUserPreferences()
    } else {
      // If there’s no session, we can stop loading (we’ll redirect later)
      setLoading(false)
    }
  }, [session])

  // Fetch saved preferences from the API
  const loadUserPreferences = async () => {
    try {
      const res = await fetch("/api/users/preferences")
      if (!res.ok) throw new Error("Failed to load preferences")
      const data = await res.json()

      // Only fall back to 13/40 if the server did not supply a number
      const minFromServer =
        typeof data.preferredAgeMin === "number" ? data.preferredAgeMin : SERVER_MIN_AGE
      const maxFromServer =
        typeof data.preferredAgeMax === "number" ? data.preferredAgeMax : 40

      setPreferences({
        genderPreference:
          typeof data.genderPreference === "string"
            ? data.genderPreference
            : "no-preference",
        preferredAgeMin: minFromServer,
        preferredAgeMax: maxFromServer,
        proximity:
          typeof data.proximity === "string" ? data.proximity : "local",
      })
    } catch (err) {
      console.error("Error loading preferences:", err)
      toast({
        title: "Error",
        description: "Could not load preferences",
        variant: "destructive",
      })
      // If the fetch fails, still initialize with a default range starting at 13
      setPreferences({
        genderPreference: "no-preference",
        preferredAgeMin: SERVER_MIN_AGE,
        preferredAgeMax: 40,
        proximity: "local",
      })
    } finally {
      setLoading(false)
    }
  }

  // Save preferences to the API, enforcing age‐range validity
  const savePreferences = async () => {
    if (!preferences) return

    const { preferredAgeMin: min, preferredAgeMax: max } = preferences

    // 1) Ensure min ≤ max
    if (min > max) {
      toast({
        title: "Invalid age range",
        description: "Minimum age cannot exceed maximum age.",
        variant: "destructive",
      })
      return
    }

    // 2) Enforce lower bound of 13
    if (min < SERVER_MIN_AGE || max < SERVER_MIN_AGE) {
      toast({
        title: "Invalid age range",
        description: `Ages must be at least ${SERVER_MIN_AGE}.`,
        variant: "destructive",
      })
      return
    }

    // 3) Enforce upper bound if needed
    if (min > SERVER_MAX_AGE || max > SERVER_MAX_AGE) {
      toast({
        title: "Invalid age range",
        description: `Ages cannot exceed ${SERVER_MAX_AGE}.`,
        variant: "destructive",
      })
      return
    }

    // 4) Now that the range is valid, send the PUT request
    setSaving(true)
    try {
      const res = await fetch("/api/users/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Failed to save preferences")
      }
      toast({ title: "Success", description: "Preferences saved." })
    } catch (err) {
      toast({
        title: "Error saving preferences",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" })
  }

  const handlePreferenceChange = (
    name: keyof UserPreferences,
    value: string | number
  ) => {
    if (!preferences) return
    setPreferences((prev) => ({
      ...prev!,
      [name]: value,
    }))
  }

  const handleAgeRangeChange = (minAge: number, maxAge: number) => {
    if (!preferences) return
    setPreferences((prev) => ({
      ...prev!,
      preferredAgeMin: minAge,
      preferredAgeMax: maxAge,
    }))
  }

  // Redirect unauthenticated users to /login
  if (status === "unauthenticated") {
    router.push("/login")
    return null
  }

  // While loading (or before preferences is set), show a spinner
  if (loading || preferences === null) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  // Once loaded, render the settings form with the real min/max from the user
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold blue-text">Settings</h1>
        <Button
          onClick={savePreferences}
          disabled={saving}
          className="bg-blue-500 hover:bg-blue-600 text-white rounded-full"
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="space-y-6">
        {/* Connection Preferences Card */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="premium-heading">Connection Preferences</CardTitle>
            <CardDescription className="premium-subheading">
              Customize who you connect with
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>I'd like to connect with</Label>
              <RadioGroup
                value={preferences.genderPreference}
                onValueChange={(val) =>
                  handlePreferenceChange("genderPreference", val)
                }
                className="grid grid-cols-1 sm:grid-cols-3 gap-2"
              >
                {GENDER_PREFERENCES.map((pref) => (
                  <div key={pref.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={pref.id} id={`pref-${pref.id}`} />
                    <Label htmlFor={`pref-${pref.id}`}>{pref.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <AgeRangeSelector
              minAge={preferences.preferredAgeMin}
              maxAge={preferences.preferredAgeMax}
              onChange={handleAgeRangeChange}
            />

            <div className="space-y-2">
              <Label>Proximity of recommendations</Label>
              <Select
                value={preferences.proximity}
                onValueChange={(val) => handlePreferenceChange("proximity", val)}
              >
                <SelectTrigger className="premium-input">
                  <SelectValue placeholder="Select proximity" />
                </SelectTrigger>
                <SelectContent>
                  {PROXIMITY_OPTIONS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Card (Coming Soon) */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="premium-heading">Notifications</CardTitle>
            <CardDescription className="premium-subheading">
              Manage your notification preferences (Coming Soon)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-blue-500" />
                  <Label htmlFor="notifications" className="premium-text">
                    Enable notifications
                  </Label>
                </div>
                <Switch
                  id="notifications"
                  checked={false}
                  onCheckedChange={() => {}}
                  className="premium-switch"
                  disabled
                />
              </div>
              <p className="text-sm text-gray-500">
                Notification settings will be available in a future update.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Account / Logout Card */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="premium-heading">Account</CardTitle>
            <CardDescription className="premium-subheading">
              Manage your account settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              className="w-full rounded-full"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
