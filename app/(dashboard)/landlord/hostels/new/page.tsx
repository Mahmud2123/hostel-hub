"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";
import { useCreateHostel } from "@/hooks/useHostels";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { CheckboxGroup } from "@/components/ui/Checkbox";
import { MultiImageUpload } from "@/components/features/MultiImageUpload";
import { FACILITIES_OPTIONS, LOCATIONS } from "@/utils/format";
import toast from "react-hot-toast";

const LOCATION_OPTIONS = LOCATIONS.map((l) => ({ value: l, label: l }));

export default function NewHostelPage() {
  const router = useRouter();
  const createHostel = useCreateHostel();

  const [form, setForm] = useState({
    name: "",
    description: "",
    location: "",
    address: "",
    price_per_year: "",
    bank_name: "",
    account_number: "",
    account_name: "",
    whatsapp_number: "",
    total_rooms: "1",
  });
  const [facilities, setFacilities] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (form.description.length < 20) errs.description = "Description must be at least 20 characters";
    if (!form.location) errs.location = "Location is required";
    if (!form.address.trim()) errs.address = "Address is required";
    if (!form.price_per_year || Number(form.price_per_year) <= 0) errs.price_per_year = "Enter a valid price";
    if (!form.bank_name.trim()) errs.bank_name = "Bank name is required";
    if (!form.account_number.trim()) errs.account_number = "Account number is required";
    if (!form.account_name.trim()) errs.account_name = "Account name is required";
    if (Number(form.total_rooms) < 1) errs.total_rooms = "At least 1 room";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    createHostel.mutate(
      {
        ...form,
        price_per_year: Number(form.price_per_year),
        total_rooms: Number(form.total_rooms),
        whatsapp_number: form.whatsapp_number || undefined,
        facilities,
        images, // ← now included
      },
      {
        onSuccess: () => {
          toast.success("Hostel submitted for approval!");
          router.push("/landlord/hostels");
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/landlord/hostels">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Add New Hostel</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Fill in the details. Your listing will be reviewed before going live.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
        <Card variant="bordered">
          <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Hostel Name"
              placeholder="e.g., Green Valley Student Lodge"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              error={errors.name}
            />
            <Textarea
              label="Description"
              placeholder="Describe your hostel, its surroundings, security, rules..."
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              error={errors.description}
              rows={4}
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <Select
                label="State / Location"
                options={LOCATION_OPTIONS}
                placeholder="Select location"
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                error={errors.location}
              />
              <Input
                label="Full Address"
                placeholder="No. 12 University Road, Bauchi"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                error={errors.address}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Price Per Academic Year (₦)"
                type="number"
                placeholder="e.g., 120000"
                value={form.price_per_year}
                onChange={(e) => set("price_per_year", e.target.value)}
                error={errors.price_per_year}
              />
              <Input
                label="Total Bed Spaces / Rooms"
                type="number"
                min="1"
                placeholder="e.g., 20"
                value={form.total_rooms}
                onChange={(e) => set("total_rooms", e.target.value)}
                error={errors.total_rooms}
                hint="Rooms will be auto-generated (Room 1, Room 2...) and assigned first-come first-served"
              />
            </div>
          </CardContent>
        </Card>

        {/* Photos — NEW */}
        <Card variant="bordered">
          <CardHeader><CardTitle>Hostel Photos</CardTitle></CardHeader>
          <CardContent>
            <MultiImageUpload
              value={images}
              onChange={setImages}
              bucket="hostel-images"
              maxFiles={6}
              label=""
            />
            <p className="text-xs text-slate-500 mt-2">
              First photo will be the cover image. You can add up to 6 photos.
            </p>
          </CardContent>
        </Card>

        {/* Facilities */}
        <Card variant="bordered">
          <CardHeader><CardTitle>Facilities & Amenities</CardTitle></CardHeader>
          <CardContent>
            <CheckboxGroup
              options={FACILITIES_OPTIONS}
              selected={facilities}
              onChange={setFacilities}
              columns={2}
            />
          </CardContent>
        </Card>

        {/* Payment Details */}
        <Card variant="bordered">
          <CardHeader><CardTitle>Payment Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-slate-400 bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
              Students will use these bank details to make manual transfers. Make sure they are accurate.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Bank Name"
                placeholder="e.g., First Bank of Nigeria"
                value={form.bank_name}
                onChange={(e) => set("bank_name", e.target.value)}
                error={errors.bank_name}
              />
              <Input
                label="Account Number"
                placeholder="10-digit account number"
                value={form.account_number}
                onChange={(e) => set("account_number", e.target.value)}
                error={errors.account_number}
              />
            </div>
            <Input
              label="Account Name"
              placeholder="Name on the bank account"
              value={form.account_name}
              onChange={(e) => set("account_name", e.target.value)}
              error={errors.account_name}
            />
            <Input
              label="WhatsApp Number (Optional)"
              placeholder="e.g., +2348012345678"
              value={form.whatsapp_number}
              onChange={(e) => set("whatsapp_number", e.target.value)}
              hint="Students can also send payment proof via WhatsApp"
            />
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Link href="/landlord/hostels">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <Button
            type="submit"
            loading={createHostel.isPending}
            leftIcon={<Building2 className="h-4 w-4" />}
          >
            Submit for Approval
          </Button>
        </div>
      </form>
    </div>
  );
}
