import { Component, HostListener, inject } from '@angular/core';
import { ModalService } from './modal-service';
import { CreateBuilding } from '../../features/building/create-building/create-building';
import { CreateUnit } from '../../features/units/create-unit/create-unit';
import { EditUnit } from '../../features/units/edit-unit/edit-unit';
import { RegisterUser } from '../../core/auth/register-user/register-user';
import { CreateParkingSpot } from '../../features/parking-spots/create-parking-spot/create-parking-spot';
import { CreateReservableSpace } from '../../features/reservable-spaces/create-reservable-space/create-reservable-space';
import { CreateReservation } from '../../features/reservable-spaces/create-reservation/create-reservation';
import { EditReservableSpace } from '../../features/reservable-spaces/edit-reservable-space/edit-reservable-space';
import { EditBuilding } from '../../features/building/edit-building/edit-building';
import { AssingBuildings } from '../../features/building/assing-buildings/assing-buildings';
import { CreateTenantClient } from '../../features/tenant-clients/create-tenant-client/create-tenant-client';
import { EditTenantClient } from '../../features/tenant-clients/edit-tenant-client/edit-tenant-client';
import { LinkUserTenantClient } from '../../features/tenant-clients/link-user-tenant-client/link-user-tenant-client';
import { CreateContract } from '../../features/contracts/create-contract/create-contract';
import { TenantClientContracts } from '../../features/contracts/tenant-client-contracts/tenant-client-contracts';
import { ContractHistory } from '../../features/contracts/contract-history/contract-history';
import { TenantClientNotes } from '../../features/internal-notes/tenant-client-notes/tenant-client-notes';
import { IncidentForm } from '../../features/incidents/incident-form/incident-form';
import { TenantClientIncidents } from '../../features/incidents/tenant-client-incidents/tenant-client-incidents';
import { SurveyRecipients } from '../../features/surveys/survey-recipients/survey-recipients';
import { ReservableSpaceSchedule } from '../../features/reservable-spaces/reservable-space-schedule/reservable-space-schedule';
import { CreateAuthorizedVisit } from '../../features/authorized-visits/create-authorized-visit/create-authorized-visit';
import { ConfirmModal } from '../confirm-modal/confirm-modal';
import { SendNotification } from '../../features/building-dashboard/send-notification/send-notification';
import { PackageNoticeForm } from '../../features/package-notices/package-notice-form/package-notice-form';

@Component({
  selector: 'app-modal',
  imports: [CreateBuilding, CreateUnit, EditUnit, RegisterUser, CreateParkingSpot, CreateReservableSpace, CreateReservation, EditReservableSpace, EditBuilding, AssingBuildings, CreateTenantClient, EditTenantClient, LinkUserTenantClient, CreateContract, TenantClientContracts, ContractHistory, TenantClientNotes, IncidentForm, TenantClientIncidents, SurveyRecipients, ReservableSpaceSchedule, CreateAuthorizedVisit, ConfirmModal, SendNotification, PackageNoticeForm],
  templateUrl: './modal.html',
  styleUrl: './modal.css',
})
export class Modal {
  protected readonly modalService = inject(ModalService);

  /** Cierra el modal al presionar Escape */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.modalService.isOpen()) {
      this.modalService.close();
    }
  }
}
