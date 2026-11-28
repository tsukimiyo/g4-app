
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {

  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "division_confirmations": {
                  Row: {
                    "comment": string | null,"created_at": string,"draft_id": string,"member_id": string,"result": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comment"?: string | null,"created_at"?: string,"draft_id": string,"member_id": string,"result": string
                  }
                  Update: {
                    "comment"?: string | null,"created_at"?: string,"draft_id"?: string,"member_id"?: string,"result"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "division_confirmations_draft_id_fkey"
      columns: ["draft_id"]
isOneToOne: false
      referencedRelation: "division_drafts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "division_confirmations_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                },"division_drafts": {
                  Row: {
                    "created_by": string,"id": string,"import_id": string | null,"llm_raw": Json | null,"open_questions": NonNullable<Json>,"project_id": string,"source": string,"status": string,"tasks": NonNullable<Json>,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_by": string,"id"?: string,"import_id"?: string | null,"llm_raw"?: Json | null,"open_questions"?: NonNullable<Json>,"project_id": string,"source": string,"status": string,"tasks"?: NonNullable<Json>,"updated_at"?: string,"version": number
                  }
                  Update: {
                    "created_by"?: string,"id"?: string,"import_id"?: string | null,"llm_raw"?: Json | null,"open_questions"?: NonNullable<Json>,"project_id"?: string,"source"?: string,"status"?: string,"tasks"?: NonNullable<Json>,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "division_drafts_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "division_drafts_import_id_fkey"
      columns: ["import_id"]
isOneToOne: false
      referencedRelation: "transcript_imports"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "division_drafts_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"invites": {
                  Row: {
                    "code": string,"expires_at": string,"project_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"expires_at": string,"project_id": string
                  }
                  Update: {
                    "code"?: string,"expires_at"?: string,"project_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "invites_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"members": {
                  Row: {
                    "color": string,"display_name": string,"id": string,"joined_at": string,"project_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "color": string,"display_name": string,"id"?: string,"joined_at"?: string,"project_id": string,"user_id": string
                  }
                  Update: {
                    "color"?: string,"display_name"?: string,"id"?: string,"joined_at"?: string,"project_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "members_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"projects": {
                  Row: {
                    "countdown_hours": number,"course": string,"created_at": string,"created_by": string,"final_deadline": string,"id": string,"member_count": number,"ta_emails": (string)[],"team_name": string,"title": string,"weekly_report_dow": number,"weekly_report_time": string
                  }
                  ComputedFields: never
                  Insert: {
                    "countdown_hours"?: number,"course": string,"created_at"?: string,"created_by": string,"final_deadline": string,"id"?: string,"member_count": number,"ta_emails"?: (string)[],"team_name": string,"title": string,"weekly_report_dow"?: number,"weekly_report_time"?: string
                  }
                  Update: {
                    "countdown_hours"?: number,"course"?: string,"created_at"?: string,"created_by"?: string,"final_deadline"?: string,"id"?: string,"member_count"?: number,"ta_emails"?: (string)[],"team_name"?: string,"title"?: string,"weekly_report_dow"?: number,"weekly_report_time"?: string
                  }
                  Relationships: [

                  ]
                },"speaker_aliases": {
                  Row: {
                    "alias": string,"member_id": string | null,"project_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alias": string,"member_id"?: string | null,"project_id": string
                  }
                  Update: {
                    "alias"?: string,"member_id"?: string | null,"project_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "speaker_aliases_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "speaker_aliases_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"task_assignees": {
                  Row: {
                    "joined_via": string,"member_id": string,"part": string | null,"task_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "joined_via"?: string,"member_id": string,"part"?: string | null,"task_id": string
                  }
                  Update: {
                    "joined_via"?: string,"member_id"?: string,"part"?: string | null,"task_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "task_assignees_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_assignees_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"tasks": {
                  Row: {
                    "created_at": string,"deadline": string,"draft_id": string,"evidence": (number)[],"id": string,"progress": number,"project_id": string,"report_every_days": number,"report_time": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deadline": string,"draft_id": string,"evidence"?: (number)[],"id"?: string,"progress"?: number,"project_id": string,"report_every_days"?: number,"report_time"?: string,"title": string
                  }
                  Update: {
                    "created_at"?: string,"deadline"?: string,"draft_id"?: string,"evidence"?: (number)[],"id"?: string,"progress"?: number,"project_id"?: string,"report_every_days"?: number,"report_time"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tasks_draft_id_fkey"
      columns: ["draft_id"]
isOneToOne: false
      referencedRelation: "division_drafts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"transcript_imports": {
                  Row: {
                    "created_at": string,"created_by": string,"error": string | null,"id": string,"meeting_date": string | null,"message_count": number,"project_id": string,"status": string,"title": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by": string,"error"?: string | null,"id"?: string,"meeting_date"?: string | null,"message_count": number,"project_id": string,"status": string,"title"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"error"?: string | null,"id"?: string,"meeting_date"?: string | null,"message_count"?: number,"project_id"?: string,"status"?: string,"title"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "transcript_imports_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "transcript_imports_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"transcript_messages": {
                  Row: {
                    "idx": number,"import_id": string,"member_id": string | null,"speaker_raw": string,"text": string,"time": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "idx": number,"import_id": string,"member_id"?: string | null,"speaker_raw": string,"text": string,"time"?: string | null
                  }
                  Update: {
                    "idx"?: number,"import_id"?: string,"member_id"?: string | null,"speaker_raw"?: string,"text"?: string,"time"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "transcript_messages_import_id_fkey"
      columns: ["import_id"]
isOneToOne: false
      referencedRelation: "transcript_imports"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "transcript_messages_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "activate_draft":
{ Args: { "p_draft_id": string }; Returns: undefined
                           },
"confirm_division_draft":
{ Args: { "p_comment": string,"p_draft_id": string,"p_expected_updated_at": string,"p_member_id": string,"p_result": string }; Returns: Json
                           },
"create_manual_draft":
{ Args: { "p_member_id": string,"p_project_id": string }; Returns: Json
                           },
"create_project_with_member":
{ Args: { "p_course": string,"p_display_name": string,"p_final_deadline": string,"p_member_count": number,"p_ta_emails": (string)[],"p_team_name": string,"p_title": string,"p_user_id": string }; Returns: Json
                           },
"is_member":
{ Args: { "p_project_id": string }; Returns: boolean
                           },
"join_project_by_invite":
{ Args: { "p_code": string,"p_display_name": string,"p_user_id": string }; Returns: Json
                           },
"set_task_frequency":
{ Args: { "p_days": number,"p_member_id": string,"p_task_id": string,"p_time": string }; Returns: Json
                           },
"submit_division_draft":
{ Args: { "p_draft_id": string,"p_expected_final_deadline": string,"p_expected_members": (string)[],"p_expected_updated_at": string,"p_member_id": string }; Returns: Json
                           },
"update_division_draft":
{ Args: { "p_draft_id": string,"p_expected_updated_at": string,"p_member_id": string,"p_open_questions": Json,"p_tasks": Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {

          }
        },"public": {
          Enums: {

          }
        }
} as const
