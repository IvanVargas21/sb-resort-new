"use client";
import { Card, CardHeader } from "@/components/ui/card";
import { format } from "date-fns";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  editReservationRemark,
  getAssignedRoom,
  getReservation,
  getReservationDetails,
} from "@/app/ServerAction/reservations.action";
import { useGlobalStore } from "@/store/useGlobalStore";
import ReservationStatusBadge from "@/components/ReservationStatusBadge";
import { getCurrentRoomTypesRate } from "@/app/ServerAction/rooms.action";
import { calculateInitialBill, isEmptyObj } from "@/utils/Helpers";
import { differenceInDays } from "date-fns";
import { useTranslation } from "next-export-i18n";
import { Skeleton } from "@/components/ui/skeleton";
import { PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { editGuest, getGuestDetails } from "@/app/ServerAction/manage.action";
import { toast } from "sonner";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Resolver } from "dns";
export default function ReservationDetails({ id }: { id: string }) {
  const { localeFns } = useGlobalStore();

  const { t } = useTranslation();
  const reservationI18n = t("ReservationsPage");
  const dashboardI18n = t("DashboardPage");
  const guestI18n = t("GuestPage");
  const locale = t("locale");

  const [guestDetailsEdit, setGuestDetailsEdit] = useState(false)
  const [remarksEdit, setRemarksEdit] = useState(false)
  const [requestEdit, setRequestEdit] = useState(false)

  
  
  const { data, isFetching, isLoading, refetch } = useQuery({
    queryKey: ["ReservationDetails", id],
    queryFn: async () => {
      const res = await getReservation(id);
      if (!res.success) throw new Error();
      return res.res;
    },
  });

  const { data: roomNumber, isLoading: roomNumLoading } = useQuery({
    queryKey: ["RoomNumber", id],
    queryFn: async () => {
      const res = await getAssignedRoom(parseInt(id));
      if (!res.success) throw new Error();
      return res.res;
    }
  })
  
  // GUEST DETAILS EDIT 

  const guestDetailsFormSchema = z.object({
    FirstName: z.string().min(1, { message: "Required" }),
    LastName: z.string().min(1, { message: "Required" }),
    Email: z.string().email().min(1, { message: "Required" }),
    Contact: z.string().min(1, { message: "Required" }),
  })

  const guestDetailsForm = useForm<z.infer<typeof guestDetailsFormSchema>>({
    resolver: zodResolver(guestDetailsFormSchema),
    values: {
      FirstName: data?.GuestData?.FirstName || "",
      LastName: data?.GuestData?.LastName || "",
      Email: data?.GuestData?.Email || "",
      Contact: data?.GuestData?.Contact || "",
    },
  });

  const guestDetailsMutation = useMutation({
    mutationKey: ["EditGuestDetails"],
    mutationFn: async (values: z.infer<typeof guestDetailsFormSchema>) => {
      console.log("fired")
      let val = {
        ...values,
        id: data.GuestId
      }
      console.log(val)
      const res = await editGuest(val);

      const test = await getGuestDetails(data.GuestId)
      console.log(test)

      if (!res.success) {
        throw new Error("Something went wrong, please try again later");
      }
      return res.res;
    },
    onSuccess: () => {
      toast.success("Success", {
        description: "Guest details updated successfully",
      });
      refetch();
      setGuestDetailsEdit(false);
    },
    onError: () => {
      toast.error("Oops!", {
        description: "Something went wrong, please try again later",
      })
    }
  })

  const guestDetailsSubmitHandler = (values: z.infer<typeof guestDetailsFormSchema>) => {
    guestDetailsMutation.mutate(values)
  }

  const { data: currentRoomtypeRate, isFetched } = useQuery({
    queryKey: ["RoomTypePrice", data?.RoomTypeId || 0],
    enabled: data ? true : false,
    queryFn: async () => {
      const res = await getCurrentRoomTypesRate(data?.RoomTypeId || 0);
      if (!res.success) throw new Error();
      return calculateInitialBill(
        new Date(data?.CreatedAt || ""),
        data?.RoomCount || 1,
        res.res[0]?.BaseRoomRate,
        res.res[0]?.WeekendRoomRate,
        data?.ExtraAdult || 0,
        res.res[0]?.ExtraAdultRate,
        res.res[0]?.WeekendExtraAdultRate,
        data?.ExtraChild || 0,
        res.res[0]?.ExtraChildRate,
        res.res[0]?.WeekendExtraChildRate,
      );
    },
  });

  // Edit Remarks

  const editRemarksFormSchema = z.object({
    Remarks: z.string().optional(),
  })

  const editRemarksForm = useForm<z.infer<typeof editRemarksFormSchema>>({
    resolver: zodResolver(editRemarksFormSchema),
    values: {
      Remarks: data?.Remarks || "",
    }
  }); 

  const editRemarksMutation = useMutation({
    mutationKey: ["EditRemarks"],
    mutationFn: async (values: z.infer<typeof editRemarksFormSchema>) => {
      const res = await editReservationRemark(id, values.Remarks);
      if (!res.success) {
        throw new Error("Something went wrong, please try again later");
      }
      return res.res;
    },
    onSuccess: () => {
      toast.success("Success", {
        description: "Remarks updated successfully",
      });
      refetch();
      setRemarksEdit(false);
    },
    onError: () => {
      toast.error("Oops!", {
        description: "Something went wrong, please try again later",
      })
    }
  })

  function onSubmit(values: z.infer<typeof editRemarksFormSchema>) {
    editRemarksMutation.mutate(values)
  }



  const cardHeaderClass =
    "flex rounded-t-md bg-cstm-primary p-1 pl-4 text-lg font-semibold text-white";

  
  
  if(isLoading) return "Loading..."
  
  return (
    <div className="flex gap-4 p-4">
      <div className="flex w-2/5 flex-col gap-4">
        <Card>
          <CardHeader className={cardHeaderClass}>
            {reservationI18n.reservaionDetails}
          </CardHeader>
          <div className="flex flex-col gap-4 p-4">
            {isLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <>
                <div className="flex w-full">
                  <p className="w-1/2 font-semibold">
                    {reservationI18n.reservationId}
                  </p>
                  <p className="w-1/2">{id}</p>
                </div>
                <div className="flex w-full">
                  <h1 className="w-1/2 font-semibold">
                    {reservationI18n.reservationDate}
                  </h1>
                  <p className="w-1/2">
                    {format(new Date(data.CreatedAt), "MMM dd, yyyy - h:mm a", {
                      locale: localeFns[locale],
                    })}
                  </p>
                </div>
                <div className="flex w-full">
                  <h1 className="w-1/2 font-semibold">
                    {dashboardI18n.forCheckIn}
                  </h1>
                  <p className="w-1/2">
                    {format(new Date(data.CheckInDate), "MMM dd, yyyy", {
                      locale: localeFns[locale],
                    })}
                  </p>
                </div>
                <div className="flex w-full">
                  <h1 className="w-1/2 font-semibold">
                    {dashboardI18n.forCheckOut}
                  </h1>
                  <p className="w-1/2">
                    {format(new Date(data.CheckOutDate), "MMM dd, yyyy", {
                      locale: localeFns[locale],
                    })}
                  </p>
                </div>
                <div className="flex w-full">
                  <h1 className="w-1/2 font-semibold">
                    {reservationI18n.reservationStatus}
                  </h1>
                  <div className="w-1/2">
                    <ReservationStatusBadge status={data?.ReservationStatus} />
                  </div>
                </div>
                <div className="flex w-full">
                  <h1 className="w-1/2 font-semibold">
                    Check-In Time
                  </h1>
                  <p className="w-1/2">
                    {
                      data.CheckInActual ?
                      format(new Date(data.CheckInActual), "MMM dd, yyyy - h:mm a", {
                        locale: localeFns[locale],
                      }) :
                      "N/A"
                  }
                  </p>
                </div>
                <div className="flex w-full">
                  <h1 className="w-1/2 font-semibold">
                    Check-Out Time
                  </h1>
                  <p className="w-1/2">
                    {
                      data.CheckOutActual ?
                      format(new Date(data.CheckOutActual), "MMM dd, yyyy - h:mm a", {
                        locale: localeFns[locale],
                      }) :
                      "N/A"
                  }
                  </p>
                </div>
                <div className="flex w-full">
                  <h1 className="w-1/2 font-semibold">
                    Room Number
                  </h1>
                  <p className="w-1/2">{`${
                    roomNumLoading ? 
                    <p>Loading...</p> :
                    (
                      (roomNumber == undefined || roomNumber == null || roomNumber.length == 0) ?
                      "Not Assigned":
                      roomNumber[0]?.RoomNumber
                    )
                  }`}</p>
                </div>
                <div className="flex w-full">
                  <h1 className="w-1/2 font-semibold">
                    {reservationI18n.numberOfNights}
                  </h1>
                  <p className="w-1/2">{`${
                    differenceInDays(
                      new Date(data.CheckOutDate),
                      new Date(data.CheckInDate),
                    )
                  } Night(s)`}</p>
                </div>
                <div className="flex w-full">
                  <h1 className="w-1/2 font-semibold">
                    {reservationI18n.reservationType}
                  </h1>
                  <p className="w-1/2">{data.ReservationType}</p>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
      <div className="flex w-3/5 flex-col gap-4">
        <Card>
          <CardHeader className={cardHeaderClass}>
            <div className="flex justify-between items-center">
              <p >{guestI18n.guestDetails}</p>
              {/* <Button onClick={() => setGuestDetailsEdit(true)} className={`${guestDetailsEdit ? "invisible" : "visible"}`}><PencilIcon size={12} color="white" className={`mr-2 `}  /> Edit</Button> */}
            </div>
          </CardHeader>
            <div className={`${guestDetailsEdit ? "block" : "hidden"} p-4`}>
              <Form {...guestDetailsForm}>
                <form
                  onSubmit={guestDetailsForm.handleSubmit(guestDetailsSubmitHandler)}
                >
                  <FormField
                    control={guestDetailsForm.control}
                    name="FirstName"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} 
                  />
                  <FormField
                    control={guestDetailsForm.control}
                    name="LastName"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} 
                  />
                  <FormField
                    control={guestDetailsForm.control}
                    name="Email"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} 
                  />
                  <FormField
                    control={guestDetailsForm.control}
                    name="Contact"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Contact Number</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} 
                  />
                  <div className="flex gap-4 p-4 justify-end">
                    <Button type="button" onClick={() => setGuestDetailsEdit(false)} variant={"outline"}>Cancel</Button>
                    <Button type="submit">Save</Button>
                  </div>
                </form>
              </Form>

            </div>
            <div className={`flex flex-col gap-4 p-4 ${guestDetailsEdit ? "hidden" : "block"}`}>
              {isLoading ? (
                <Skeleton className="h-12 w-full" />
              ) : (
                <>
                  <div className="flex w-full">
                    <h1 className="w-1/2 font-semibold">{guestI18n.guestName}</h1>
                    <p className="w-1/2">{`${data?.GuestData?.FirstName || "Anonymous"} ${data?.GuestData?.LastName || "Guest"}`}</p>
                  </div>
                  <div className="flex w-full">
                    <h1 className="w-1/2 font-semibold">
                      {guestI18n.guestEmail}
                    </h1>
                    <p className="w-1/2">{data?.GuestData?.Email || "N/A"}</p>
                  </div>
                  <div className="flex w-full">
                    <h1 className="w-1/2 font-semibold">
                      {guestI18n.guestPhone}
                    </h1>
                    <p className="w-1/2">{data?.GuestData?.Contact || "N/A"}</p>
                  </div>
                  <div className="flex w-full">
                    <h1 className="w-1/2 font-semibold">
                      {reservationI18n.extraAdult}
                    </h1>
                    <p className="w-1/2">{data.ExtraAdult}</p>
                  </div>
                  <div className="flex w-full">
                    <h1 className="w-1/2 font-semibold">
                      {reservationI18n.extraChild}
                    </h1>
                    <p className="w-1/2">{data.ExtraChild}</p>
                  </div>
                </>
              )}
            </div>
        </Card>
        <Card>
          <CardHeader className={cardHeaderClass}>
            <div className="flex justify-between items-center">
              <p >{reservationI18n.specialRequest}</p>
              {/* <Button onClick={() => {setRequestEdit(true)}} className={`${requestEdit ? "invisible" : "visible"}`}><PencilIcon size={12} color="white" className={`mr-2 `}  /> Edit</Button> */}
            </div>
          </CardHeader>
          {requestEdit ? (
            <div className="flex gap-4 p-4 justify-end">
              <Button onClick={() => {setRequestEdit(false)}} variant={"outline"}>Cancel</Button>
              <Button>Save</Button>
            </div>
          ): (
            <div className="p-4">
              {data.Request ? (
                <h1 className="">
                  {data.Request}
                </h1>
              ) : (
                <h1 className="text-center">N/A</h1>
              )}
            </div>

          )}
        </Card>
        <Card>
          <CardHeader className={cardHeaderClass}>
            <div className="flex justify-between items-center">
              <p >{reservationI18n.remarks}</p>
              <Button onClick={() => {setRemarksEdit(true)}} className={`${remarksEdit ? "invisible" : "visible"}`}><PencilIcon size={12} color="white" className={`mr-2 `}  /> Edit</Button>
            </div>
          </CardHeader>
          {remarksEdit ? (
            <div>
              <Form {...editRemarksForm}>
                <form className="p-4" onSubmit={editRemarksForm.handleSubmit(onSubmit)}>
                  <FormField
                    control={editRemarksForm.control}
                    name="Remarks"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-4 p-4 justify-end">
                    <Button onClick={() => {setRemarksEdit(false)}} variant={"outline"}>Cancel</Button>
                    <Button type="submit" >Save</Button>
                  </div>
                </form>
              </Form>
            </div>
          ) : (
            <div className="p-4">
              {data.Remarks ? (
                <h1 className="">
                  {data.Remarks}
                </h1>
              ) : (
                <h1 className="text-center font-semibold">N/A</h1>
              )}
            </div>

          )}
        </Card>
      </div>
    </div>
  );
}
