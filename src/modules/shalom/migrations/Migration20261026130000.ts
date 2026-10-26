import { Migration } from "@mikro-orm/migrations"

export class Migration20261026130000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table if not exists "shalom_setting" (
      "id" text not null,
      "origin_ter_id" integer null,
      "origin_name" text null,
      "origin_address" text null,
      "instance_id" text null,
      "surcharge" real not null default 0,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      "deleted_at" timestamptz null,
      constraint "shalom_setting_pkey" primary key ("id")
    );`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_shalom_setting_deleted_at" ON "shalom_setting" (deleted_at) WHERE deleted_at IS NULL;`)

    this.addSql(`create table if not exists "shalom_shipment" (
      "id" text not null,
      "order_id" text not null,
      "order_display_id" integer null,
      "status" text check ("status" in ('pendiente', 'creada', 'error', 'cancelada')) not null default 'pendiente',
      "ter_id" integer not null,
      "agency_name" text null,
      "agency_address" text null,
      "dni" text not null,
      "phone" text null,
      "recipient_name" text null,
      "package_content" text null,
      "shipping_amount" real null,
      "clave" text null,
      "guia" text null,
      "codigo" text null,
      "ose_id" text null,
      "error" text null,
      "response" jsonb null,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      "deleted_at" timestamptz null,
      constraint "shalom_shipment_pkey" primary key ("id")
    );`)
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_shalom_shipment_order_id_unique" ON "shalom_shipment" (order_id) WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_shalom_shipment_deleted_at" ON "shalom_shipment" (deleted_at) WHERE deleted_at IS NULL;`)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "shalom_shipment" cascade;`)
    this.addSql(`drop table if exists "shalom_setting" cascade;`)
  }
}
