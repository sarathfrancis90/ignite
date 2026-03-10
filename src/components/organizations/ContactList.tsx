"use client";

import * as React from "react";
import { Plus, Mail, Phone, Star, Send, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ContactFormDialog } from "./ContactFormDialog";

interface ContactListProps {
  organizationId: string;
}

export function ContactList({ organizationId }: ContactListProps) {
  const [showForm, setShowForm] = React.useState(false);
  const [editingContactId, setEditingContactId] = React.useState<string | null>(null);

  const utils = trpc.useUtils();
  const contactsQuery = trpc.organization.listContacts.useQuery({
    organizationId,
    limit: 50,
  });

  const deleteContact = trpc.organization.deleteContact.useMutation({
    onSuccess: () => {
      void utils.organization.listContacts.invalidate({ organizationId });
      void utils.organization.getById.invalidate({ id: organizationId });
    },
  });

  const inviteContact = trpc.organization.inviteContact.useMutation({
    onSuccess: () => {
      void utils.organization.listContacts.invalidate({ organizationId });
    },
  });

  function handleDelete(contactId: string) {
    if (window.confirm("Are you sure you want to delete this contact?")) {
      deleteContact.mutate({ id: contactId });
    }
  }

  function handleInvite(contactId: string) {
    inviteContact.mutate({ id: contactId });
  }

  const editingContact =
    editingContactId && contactsQuery.data
      ? contactsQuery.data.items.find((c) => c.id === editingContactId)
      : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Contacts</CardTitle>
        <Button
          size="sm"
          onClick={() => {
            setEditingContactId(null);
            setShowForm(true);
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add Contact
        </Button>
      </CardHeader>
      <CardContent>
        {contactsQuery.isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-50" />
            ))}
          </div>
        )}

        {contactsQuery.data && contactsQuery.data.items.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-500">
            No contacts yet. Add your first contact.
          </p>
        )}

        {contactsQuery.data && contactsQuery.data.items.length > 0 && (
          <div className="divide-y divide-gray-100">
            {contactsQuery.data.items.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {contact.firstName} {contact.lastName}
                    </span>
                    {contact.isPrimary && (
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    )}
                    {contact.invitationStatus !== "NOT_INVITED" && (
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          contact.invitationStatus === "REGISTERED"
                            ? "bg-green-50 text-green-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {contact.invitationStatus === "INVITED" ? "Invited" : "Registered"}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500">
                    {contact.title && <span>{contact.title}</span>}
                    {contact.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {contact.email}
                      </span>
                    )}
                    {contact.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {contact.phone}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {contact.email && contact.invitationStatus === "NOT_INVITED" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleInvite(contact.id)}
                      disabled={inviteContact.isPending}
                      title="Send invite"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingContactId(contact.id);
                      setShowForm(true);
                    }}
                    title="Edit contact"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(contact.id)}
                    disabled={deleteContact.isPending}
                    title="Delete contact"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {showForm && (
        <ContactFormDialog
          organizationId={organizationId}
          contact={editingContact ?? undefined}
          onClose={() => {
            setShowForm(false);
            setEditingContactId(null);
          }}
        />
      )}
    </Card>
  );
}
