export type ClubStatus = "active" | "suspended" | "onboarding";
export type ClubCategory = "sports" | "social" | "alumni" | "professional" | "other";
export type BillingInterval = "monthly" | "annual" | "one_time";
export type MemberStatus = "pending" | "active" | "expired" | "suspended" | "cancelled";
export type EventStatus = "draft" | "published" | "cancelled" | "completed";
export type RegistrationStatus = "registered" | "waitlisted" | "cancelled" | "attended" | "no_show";
export type PaymentType = "membership_fee" | "event_ticket" | "other";
export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";
export type AnnouncementAudience = "all" | "plan_specific" | "role_specific";
export type NotificationChannel = "in_app" | "push" | "email" | "sms";
export type GeocodeStatus = "pending" | "ok" | "failed";
export type MediaKind = "logo" | "cover" | "gallery_photo" | "gallery_video" | "event_cover" | "post_photo" | "post_video";

export const PERMISSION_KEYS = [
  "members.view",
  "members.edit",
  "members.export",
  "events.create",
  "events.register",
  "payments.view",
  "payments.refund",
  "announcements.send",
  "club.settings",
  "roles.manage",
  "audit.view",
  "posts.create",
  "messages.reply",
] as const;
export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export interface Club {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  category: ClubCategory;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  timezone: string;
  currency: string;
  status: ClubStatus;
  primary_color: string;
  created_by: string | null;
  created_at: string;
  package_tier_id: string;
  latitude: number | null;
  longitude: number | null;
  geocode_status: GeocodeStatus;
}

export interface ClubPackageTier {
  id: string;
  key: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  photo_quota: number;
  video_quota: number;
  streaming_enabled: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface EventVote {
  id: string;
  event_id: string;
  user_id: string;
  value: 1 | -1;
  created_at: string;
}

export interface EventPublic {
  id: string;
  club_id: string;
  club_slug: string;
  club_name: string;
  club_logo_url: string | null;
  club_primary_color: string;
  latitude: number;
  longitude: number;
  title: string;
  description: string | null;
  category: string | null;
  cover_image_url: string | null;
  start_at: string;
  end_at: string | null;
  price_cents: number;
  currency: string;
  score: number;
}

export interface ClubMediaAsset {
  id: string;
  club_id: string;
  kind: MediaKind;
  storage_path: string;
  url: string;
  event_id: string | null;
  uploaded_by: string | null;
  size_bytes: number | null;
  created_at: string;
}

export interface MembershipPlan {
  id: string;
  club_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  billing_interval: BillingInterval;
  grace_period_days: number;
  is_active: boolean;
  max_members: number | null;
  sort_order: number;
  created_at: string;
}

export interface Member {
  id: string;
  user_id: string;
  club_id: string;
  membership_plan_id: string | null;
  member_number: string | null;
  status: MemberStatus;
  joined_at: string | null;
  expires_at: string | null;
  renewed_at: string | null;
  emergency_contact: Record<string, unknown> | null;
  custom_fields: Record<string, unknown>;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  username: string;
  bio: string | null;
  created_at: string;
}

export interface ProfilePublic {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

export interface EventRow {
  id: string;
  club_id: string;
  title: string;
  description: string | null;
  category: string | null;
  location: string | null;
  is_virtual: boolean;
  start_at: string;
  end_at: string | null;
  timezone: string;
  capacity: number | null;
  registration_deadline: string | null;
  price_cents: number;
  currency: string;
  status: EventStatus;
  cover_image_url: string | null;
  created_by: string | null;
  created_at: string;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  member_id: string;
  status: RegistrationStatus;
  registered_at: string;
  checked_in_at: string | null;
  payment_id: string | null;
}

export interface Announcement {
  id: string;
  club_id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  audience_plan_id: string | null;
  audience_role_id: string | null;
  channels: NotificationChannel[];
  scheduled_at: string | null;
  sent_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  club_id: string;
  member_id: string;
  type: PaymentType;
  amount_cents: number;
  currency: string;
  provider: string;
  provider_reference: string | null;
  status: PaymentStatus;
  invoice_number: string | null;
  paid_at: string | null;
  receipt_url: string | null;
  event_id: string | null;
  membership_plan_id: string | null;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  club_id: string | null;
  announcement_id: string | null;
  type: string;
  channel: NotificationChannel;
  title: string | null;
  body: string | null;
  status: "queued" | "sent" | "delivered" | "failed";
  read_at: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface Role {
  id: string;
  club_id: string | null;
  name: string;
  description: string | null;
  is_system: boolean;
}

// ---------------------------------------------------------------------------
// Social layer (20261014000000_social.sql)
// ---------------------------------------------------------------------------

export interface ClubPublic {
  id: string;
  name: string;
  slug: string;
  category: string;
  logo_url: string | null;
  cover_image_url: string | null;
  primary_color: string;
  latitude: number;
  longitude: number;
  description: string | null;
}

export type PostKind = "photo" | "video" | "carousel" | "event";

export interface PostMediaItem {
  url: string;
  kind: "post_photo" | "post_video";
}

export interface PostFeedItem {
  id: string;
  club_id: string;
  club_slug: string;
  club_name: string;
  club_logo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  caption: string | null;
  kind: PostKind;
  created_at: string;
  event_id: string | null;
  event_title: string | null;
  event_start_at: string | null;
  event_price_cents: number | null;
  event_currency: string | null;
  event_location: string | null;
  media: PostMediaItem[];
  like_count: number;
  comment_count: number;
}

export interface ClubStats {
  club_id: string;
  follower_count: number;
  post_count: number;
  upcoming_event_count: number;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

export interface Story {
  id: string;
  club_id: string;
  storage_path: string;
  media_url: string;
  kind: "photo" | "video";
  created_at: string;
  expires_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  as_club: boolean;
  body: string | null;
  shared_post_id: string | null;
  shared_event_id: string | null;
  shared_club_id: string | null;
  created_at: string;
}
